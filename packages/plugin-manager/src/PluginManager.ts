import { RunContext, EnableContext } from './Context.js'
import { Plugin } from './Plugin.js'
import { race, timeout } from '@johngw/async'
import DependencyGraph from './DependencyGraph.js'

export interface PluginManagerOptions<
  ExtraContext extends Record<string, unknown>,
  ExtraEnableContext extends Record<string, unknown>,
  ExtraRunContext extends Record<string, unknown>,
> {
  addContext?(pluginName: string): ExtraContext
  addEnableContext?(pluginName: string): ExtraEnableContext
  addRunContext?(pluginName: string): ExtraRunContext
  pluginTimeout?: number
}

export default class PluginManager<
  ExtraContext extends Record<string, unknown>,
  ExtraEnableContext extends Record<string, unknown>,
  ExtraRunContext extends Record<string, unknown>,
> {
  #plugins: Record<string, Plugin> = {}
  #dependencyGraph = new DependencyGraph<Plugin>()
  #ran = new WeakSet<Plugin>()
  #abortControllers = new WeakMap<Plugin, AbortController>()
  #pluginsToEnable = new Set<string>()
  #enabledPlugins = new Set<string>()
  #options: PluginManagerOptions<
    ExtraContext,
    ExtraEnableContext,
    ExtraRunContext
  >

  constructor(
    options: PluginManagerOptions<
      ExtraContext,
      ExtraEnableContext,
      ExtraRunContext
    > = {},
  ) {
    this.#options = options
  }

  get enabledPlugins() {
    return [...this.#enabledPlugins]
  }

  /**
   * Used for testing. This will **replace** parts of the context... not add to it.
   */
  withOptions(
    options: PluginManagerOptions<
      ExtraContext,
      ExtraEnableContext,
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
      addEnableContext: (pluginName) =>
        ({
          ...this.#options.addEnableContext?.(pluginName),
          ...options.addEnableContext?.(pluginName),
        }) as ExtraEnableContext,
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
    plugin: Plugin<
      EnableContext & ExtraContext & ExtraEnableContext,
      RunContext & ExtraContext & ExtraRunContext
    >,
  ): void

  registerPlugin(
    name: string,
    plugin: Omit<
      Plugin<
        EnableContext & ExtraContext & ExtraEnableContext,
        RunContext & ExtraContext & ExtraRunContext
      >,
      'name'
    >,
  ): void

  registerPlugin(
    nameOrPlugin:
      | string
      | Plugin<
          EnableContext & ExtraContext & ExtraEnableContext,
          RunContext & ExtraContext & ExtraRunContext
        >,
    plugin?: Omit<
      Plugin<
        EnableContext & ExtraContext & ExtraEnableContext,
        RunContext & ExtraContext & ExtraRunContext
      >,
      'name'
    >,
  ) {
    this.#addPlugin(
      plugin
        ? { name: nameOrPlugin as string, ...plugin }
        : (nameOrPlugin as Plugin<
            EnableContext & ExtraContext & ExtraEnableContext,
            RunContext & ExtraContext & ExtraRunContext
          >),
    )
  }

  #addPlugin(plugin: Plugin) {
    this.#plugins[plugin.name] = plugin
    this.#dependencyGraph.vertex(plugin)
    if (plugin.dependencies)
      for (const dependency of plugin.dependencies)
        this.#dependencyGraph.addDependency(plugin, this.#getPlugin(dependency))
    if (plugin.optionalDependencies)
      for (const dependency of plugin.optionalDependencies)
        this.#dependencyGraph.addOptionalDependency(
          plugin,
          this.#getPlugin(dependency),
        )
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
    this.#pluginsToEnable = new Set(pluginNames)
    let promises: Promise<void>[] = []

    for (const pluginName of this.#pluginsToEnable) {
      this.#pluginsToEnable.delete(pluginName)
      if (!this.#enabledPlugins.has(pluginName)) {
        let plugin: Plugin

        try {
          plugin = this.#getPlugin(pluginName)
        } catch (error: any) {
          console.warn(error.message)
          continue
        }

        promises.push(this.#enablePlugin(plugin))
      }
    }
    await Promise.all(promises)
  }

  async #enableOptionalDependencies(plugin: Plugin) {
    if (!plugin?.optionalDependencies?.length) return

    const optionalDependencies: string[] = []

    for (const dependencyName of plugin.optionalDependencies) {
      if (
        !this.#enabledPlugins.has(dependencyName) &&
        this.#pluginsToEnable.has(dependencyName)
      )
        optionalDependencies.push(dependencyName)
    }

    if (optionalDependencies.length)
      await this.enablePlugins(optionalDependencies)
  }

  /**
   * Disable plugins, by name.
   *
   * @remarks
   * By default, the method will cautiously remove plugins. IE, if they're depended
   * on by other plugins it will **not** be disabled.
   *
   * However, you can force a plugin, and it's dependers, to be disabled by passing
   * the force flag.
   */
  readonly disablePlugins = (pluginNames: string[], force = false) => {
    return pluginNames.reduce(
      (disabled, pluginName) =>
        disabled + this.#disablePlugin(this.#getPlugin(pluginName), force),
      0,
    )
  }

  disableAllPlugins() {
    return this.disablePlugins(Object.keys(this.#plugins))
  }

  #disablePlugin(plugin: Plugin, force: boolean): number {
    let disabled = 0
    this.#pluginsToEnable.delete(plugin.name) // incase we're disabling plugins during the enable phase
    if (!this.#enabledPlugins.has(plugin.name)) return disabled
    if (this.#isDependencyOfEnabledPlugin(plugin)) {
      if (force)
        for (const depender of this.#dependencyGraph.dependers(plugin))
          disabled += this.#disablePlugin(depender, force)
      else return disabled
    }
    if (this.#isOptionalDependencyOfEnabledPlugin(plugin)) {
      if (force)
        for (const depender of this.#dependencyGraph.optionalDependers(plugin))
          disabled += this.#disablePlugin(depender, force)
      else return disabled
    }
    this.#enabledPlugins.delete(plugin.name)
    this.#ran.delete(plugin)
    this.#abortControllers.get(plugin)?.abort()
    for (const dep of this.#dependencyGraph.dependencies(plugin))
      disabled += this.#disablePlugin(dep, false) // Never force disable dependencies
    return disabled + 1
  }

  #isDependencyOfEnabledPlugin(dependency: Plugin) {
    for (const plugin of this.#dependencyGraph.dependers(dependency))
      if (this.#enabledPlugins.has(plugin.name)) return true
    return false
  }

  #isOptionalDependencyOfEnabledPlugin(dependency: Plugin) {
    for (const plugin of this.#dependencyGraph.optionalDependers(dependency))
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
          this.#enabledPlugins.delete(plugin.name)
          this.#ran.delete(plugin)
          this.#abortControllers.delete(plugin)
        },
        { once: true },
      )
      this.#abortControllers.set(plugin, abortController)
    }
    return this.#abortControllers.get(plugin)!
  }

  async #enablePlugin(plugin: Plugin) {
    this.#enabledPlugins.add(plugin.name)

    const dependencyPromises: Promise<void>[] = []
    if (plugin.dependencies)
      dependencyPromises.push(this.enablePlugins(plugin.dependencies))
    if (plugin.optionalDependencies)
      dependencyPromises.push(this.#enableOptionalDependencies(plugin))
    if (dependencyPromises.length) await Promise.all(dependencyPromises)

    if (!plugin.enable) return

    const { signal } = this.#abortController(plugin)
    if (signal.aborted) return

    await this.#pluginRace(
      plugin,
      () => plugin.enable!(this.#createEnableContext(plugin, signal)),
      plugin.enableTimeout || this.#options.pluginTimeout,
    )
  }

  async #runPlugin(plugin: Plugin) {
    await this.#filterMapDependencies(
      plugin,
      (dep) => !this.#ran.has(dep),
      (dep) => this.#runPlugin(dep),
    )

    if (this.#ran.has(plugin) || !plugin.run) return

    const { signal } = this.#abortController(plugin)
    if (signal.aborted) return

    this.#ran.add(plugin)

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

  #createEnableContext(plugin: Plugin, signal: AbortSignal) {
    return {
      enablePlugins: this.enablePlugins,
      disablePlugins: this.disablePlugins,
      ...this.#createContext(plugin, signal),
      ...(this.#options.addEnableContext?.(plugin.name) || {}),
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
