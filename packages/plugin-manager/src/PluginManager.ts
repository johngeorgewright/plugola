import { RunContext, InitContext } from './Context'
import { Plugin } from './Plugin'
import { race, timeout } from '@johngw/async'
import DependencyGraph from './DependencyGraph'

export interface PluginManagerOptions<
  ExtraContext extends Record<string, unknown>,
  ExtraInitContext extends Record<string, unknown>,
  ExtraRunContext extends Record<string, unknown>,
> {
  addContext?(pluginName: string): ExtraContext
  addInitContext?(pluginName: string): ExtraInitContext
  addRunContext?(pluginName: string): ExtraRunContext
  pluginTimeout?: number
}

export default class PluginManager<
  ExtraContext extends Record<string, unknown>,
  ExtraInitContext extends Record<string, unknown>,
  ExtraRunContext extends Record<string, unknown>,
> {
  #plugins: Record<string, Plugin> = {}
  #dependencyGraph = new DependencyGraph<Plugin>()
  #initialized = new Set<Plugin>()
  #ran = new Set<Plugin>()
  #abortControllers = new WeakMap<Plugin, AbortController>()
  #enabledPlugins = new Set<string>()
  #options: PluginManagerOptions<
    ExtraContext,
    ExtraInitContext,
    ExtraRunContext
  >

  constructor(
    options: PluginManagerOptions<
      ExtraContext,
      ExtraInitContext,
      ExtraRunContext
    > = {},
  ) {
    this.#options = options
  }

  /**
   * Used for testing. This will **replace** parts of the context... not add to it.
   */
  withOptions(
    options: PluginManagerOptions<
      ExtraContext,
      ExtraInitContext,
      ExtraRunContext
    >,
  ) {
    const pluginManager = new PluginManager({
      ...options,
      addContext: (pluginName) =>
        ({
          ...this.#options.addContext?.(pluginName),
          ...options.addContext?.(pluginName),
        }) as ExtraContext,
      addInitContext: (pluginName) =>
        ({
          ...this.#options.addInitContext?.(pluginName),
          ...options.addInitContext?.(pluginName),
        }) as ExtraInitContext,
      addRunContext: (pluginName) =>
        ({
          ...this.#options.addRunContext?.(pluginName),
          ...options.addRunContext?.(pluginName),
        }) as ExtraRunContext,
    })
    pluginManager.#plugins = this.#plugins
    pluginManager.#dependencyGraph = this.#dependencyGraph
    pluginManager.#abortControllers = this.#abortControllers
    return pluginManager
  }

  registerPlugin(
    name: string,
    plugin: Omit<
      Plugin<
        InitContext & ExtraContext & ExtraInitContext,
        RunContext & ExtraContext & ExtraRunContext
      >,
      'name'
    >,
  ) {
    this.#addPlugin({ name, ...plugin })
  }

  #addPlugin(plugin: Plugin) {
    this.#plugins[plugin.name] = plugin
    this.#dependencyGraph.vertex(plugin)
    const { dependencies = [] } = plugin
    for (const dependency of dependencies)
      this.#dependencyGraph.addDependency(plugin, this.#getPlugin(dependency))
  }

  async run() {
    let promises: Promise<void>[] = []
    for (const pluginName of this.#enabledPlugins)
      promises.push(this.#runPlugin(this.#getPlugin(pluginName)))
    await Promise.all(promises)
  }

  async enableAllPlugins() {
    await this.enablePlugins(Object.keys(this.#plugins))
  }

  readonly enablePlugins = async (pluginNames: string[]) => {
    let promises: Promise<void>[] = []
    for (const pluginName of pluginNames) {
      if (!this.#enabledPlugins.has(pluginName)) {
        this.#enabledPlugins.add(pluginName)
        promises.push(this.#initPlugin(this.#getPlugin(pluginName)))
      }
    }
    await Promise.all(promises)
  }

  readonly disablePlugins = (pluginNames: string[]) => {
    let disabled = 0
    for (const pluginName of pluginNames) {
      const plugin = this.#getPlugin(pluginName)
      if (this.#disablePlugin(plugin)) disabled++
      for (const dep of this.#dependencyGraph.dependencies(plugin))
        if (this.#disablePlugin(dep)) disabled++
    }
    return disabled
  }

  #disablePlugin(plugin: Plugin) {
    if (!this.#enabledPlugins.has(plugin.name)) return false
    if (this.#isDependencyOfEnabledPlugin(plugin)) return false
    this.#enabledPlugins.delete(plugin.name)
    this.#abortControllers.get(plugin)?.abort()
    return true
  }

  #isDependencyOfEnabledPlugin(dependency: Plugin) {
    for (const plugin of this.#dependencyGraph.whichDependOn(dependency))
      if (this.#enabledPlugins.has(plugin.name)) return true
    return false
  }

  #getPlugin(pluginName: string) {
    if (!this.#plugins[pluginName])
      throw new Error(`The plugin "${pluginName}" isn't registered.`)
    return this.#plugins[pluginName]
  }

  #abortController(plugin: Plugin) {
    if (!this.#abortControllers.has(plugin)) {
      const abortController = new AbortController()
      abortController.signal.addEventListener(
        'abort',
        () => {
          this.#initialized.delete(plugin)
          this.#ran.delete(plugin)
          this.#abortControllers.delete(plugin)
        },
        { once: true },
      )
      this.#abortControllers.set(plugin, abortController)
    }
    return this.#abortControllers.get(plugin)!
  }

  async #initPlugin(plugin: Plugin) {
    if (this.#initialized.has(plugin) || !plugin.init) return

    const { signal } = this.#abortController(plugin)
    if (signal.aborted) return

    this.#initialized.add(plugin)

    await this.#filterMapDependencies(
      plugin,
      (dep) => !this.#initialized.has(dep),
      (dep) => this.#initPlugin(dep),
    )

    await this.#pluginRace(
      plugin,
      () => plugin.init!(this.#createInitContext(plugin, signal)),
      plugin.initTimeout || this.#options.pluginTimeout,
    )
  }

  async #runPlugin(plugin: Plugin) {
    if (this.#ran.has(plugin) || !plugin.run) return

    const { signal } = this.#abortController(plugin)
    if (signal.aborted) return

    this.#ran.add(plugin)

    await this.#filterMapDependencies(
      plugin,
      (dep) => !this.#ran.has(dep),
      (dep) => this.#runPlugin(dep),
    )

    await this.#pluginRace(
      plugin,
      () => plugin.run!(this.#createRunContext(plugin, signal)),
      this.#options.pluginTimeout,
    )
  }

  #pluginRace(plugin: Plugin, fn: () => Promise<any>, ms?: number) {
    const { signal } = this.#abortController(plugin)

    return ms === undefined
      ? fn()
      : race(
          (signal) => [
            fn(),
            timeout(ms, signal).then(() => this.disablePlugins([plugin.name])),
          ],
          signal,
        )
  }

  async #filterMapDependencies(
    plugin: Plugin,
    filter: (plugin: Plugin) => boolean,
    map: (plugin: Plugin) => Promise<any>,
  ) {
    const promises = []

    for (const dep of this.#dependencyGraph.dependencies(plugin))
      if (filter(dep)) promises.push(map(dep))

    await Promise.all(promises)
  }

  #createInitContext(plugin: Plugin, signal: AbortSignal) {
    return {
      enablePlugins: this.enablePlugins,
      disablePlugins: this.disablePlugins,
      ...this.#createContext(plugin, signal),
      ...(this.#options.addInitContext?.(plugin.name) || {}),
    }
  }

  #createRunContext(
    plugin: Plugin,
    signal: AbortSignal,
  ): Record<string, unknown> {
    return {
      ...this.#createContext(plugin, signal),
      ...(this.#options.addRunContext?.(plugin.name) || {}),
    }
  }

  #createContext({ name }: Plugin, signal: AbortSignal) {
    return {
      signal,
      ...(this.#options.addContext?.(name) || {}),
    }
  }
}
