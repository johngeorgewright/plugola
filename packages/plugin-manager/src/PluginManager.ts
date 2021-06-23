import {
  Context,
  InitContext,
  isStatefulContext,
  StatefulContext,
} from './Context'
import { isStatefulPlugin, Plugin, StatefulPlugin } from './Plugin'
import Store, { ActionI, Reducer } from '@plugola/store'
import type { MessageBus, MessageBusBroker } from '@plugola/message-bus'
import { Logger } from '@plugola/logger'
import { race, timeout } from '@johngw/async'
import AbortController, { AbortSignal } from 'node-abort-controller'
import DependencyGraph from './DependencyGraph'

export interface PluginManagerOptions<
  ExtraContext extends Record<string, unknown>,
  ExtraInitContext extends Record<string, unknown>,
  ExtraRunContext extends Record<string, unknown>
> {
  addContext?(pluginName: string): ExtraContext
  addInitContext?(pluginName: string): ExtraInitContext
  addRunContext?(pluginName: string): ExtraRunContext
  pluginTimeout?: number
}

export default class PluginManager<
  MB extends MessageBus,
  ExtraContext extends Record<string, unknown> = {},
  ExtraInitContext extends Record<string, unknown> = {},
  ExtraRunContext extends Record<string, unknown> = {}
> {
  #plugins: Record<string, Plugin> = {}
  #dependencyGraph = new DependencyGraph<Plugin>()
  #initialized = new Set<Plugin>()
  #ran = new Set<Plugin>()
  #abortControllers = new WeakMap<Plugin, AbortController>()
  #enabledPlugins = new Set<string>()

  #messageBus: MB
  #createExtraContext?: (pluginName: string) => ExtraContext
  #createExtraInitContext?: (pluginName: string) => ExtraInitContext
  #createExtraRunContext?: (pluginName: string) => ExtraRunContext
  #pluginTimeout?: number

  constructor(
    messageBus: MB,
    options: PluginManagerOptions<
      ExtraContext,
      ExtraInitContext,
      ExtraRunContext
    > = {}
  ) {
    this.#messageBus = messageBus
    this.#createExtraContext = options.addContext
    this.#createExtraInitContext = options.addInitContext
    this.#createExtraRunContext = options.addRunContext
    this.#pluginTimeout = options.pluginTimeout
  }

  registerStatefulPlugin<Action extends ActionI, State>(
    plugin: StatefulPlugin<
      Action,
      State,
      InitContext<MB> & ExtraContext & ExtraInitContext,
      StatefulContext<MB, Action, State> & ExtraContext & ExtraRunContext
    >
  ) {
    this.#addPlugin(plugin)
  }

  registerPlugin(
    plugin: Plugin<
      InitContext<MB> & ExtraContext & ExtraInitContext,
      Context<MB> & ExtraContext & ExtraRunContext
    >
  ) {
    this.#addPlugin(plugin)
  }

  #addPlugin(plugin: Plugin) {
    this.#plugins[plugin.name] = plugin
    this.#dependencyGraph.vertex(plugin)
    const dependencies = plugin.dependencies || []
    for (const dependency of dependencies) {
      this.#dependencyGraph.addDependency(plugin, this.#getPlugin(dependency))
    }
  }

  async run() {
    await this.#mapEnabledPlugins((plugin) => this.#runPlugin(plugin))
  }

  async enableAllPlugins() {
    await this.enablePlugins(Object.keys(this.#plugins))
  }

  readonly enablePlugins = async (pluginNames: string[]) => {
    for (const pluginName of pluginNames) {
      this.#enabledPlugins.add(pluginName)
    }

    await this.#mapEnabledPlugins(
      (plugin) => this.#initPlugin(plugin),
      pluginNames
    )
  }

  readonly disablePlugins = (pluginNames: string[]) => {
    let disabled = 0
    for (const pluginName of pluginNames) {
      const plugin = this.#getPlugin(pluginName)
      if (this.#disablePlugin(plugin)) disabled++
      for (const dep of this.#dependencyGraph.dependencies(plugin)) {
        if (this.#disablePlugin(dep)) disabled++
      }
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
    for (const plugin of this.#dependencyGraph.whichDependOn(dependency)) {
      if (this.#enabledPlugins.has(plugin.name)) return true
    }
    return false
  }

  #getPlugin(pluginName: string) {
    if (!this.#plugins[pluginName]) {
      throw new Error(`The plugin "${pluginName}" isn't registered.`)
    }
    return this.#plugins[pluginName]
  }

  #abortController(plugin: Plugin) {
    if (!this.#abortControllers.has(plugin)) {
      const abortController = new AbortController()
      abortController.signal.addEventListener('abort', () => {
        this.#initialized.delete(plugin)
        this.#ran.delete(plugin)
        this.#abortControllers.delete(plugin)
      })
      this.#abortControllers.set(plugin, abortController)
    }
    return this.#abortControllers.get(plugin)!
  }

  async #initPlugin(plugin: Plugin, signal?: AbortSignal) {
    if (this.#initialized.has(plugin) || !plugin.init || signal?.aborted) {
      return
    }

    const abortController = this.#abortController(plugin)
    signal?.addEventListener('abort', () => abortController.abort())

    this.#initialized.add(plugin)

    await this.#pluginRace(
      async (signal) => {
        await this.#mapDependencies(
          plugin,
          (dep) => !this.#initialized.has(dep),
          (dep) => this.#initPlugin(dep, signal)
        )

        const context = this.#createInitContext(plugin, signal)
        await plugin.init!(context)
      },
      abortController.signal,
      plugin.initTimeout || this.#pluginTimeout
    )
  }

  async #runPlugin(plugin: Plugin, signal?: AbortSignal) {
    if (this.#ran.has(plugin) || !plugin.run || signal?.aborted) {
      return
    }

    const abortController = this.#abortController(plugin)
    signal?.addEventListener('abort', () => abortController.abort())

    this.#ran.add(plugin)

    await this.#pluginRace(
      async (signal) => {
        await this.#mapDependencies(
          plugin,
          (dep) => !this.#ran.has(dep),
          (dep) => this.#runPlugin(dep, signal)
        )

        const context = this.#createRunContext(plugin, signal)

        if (isStatefulContext(context)) {
          // @ts-ignore
          context.store.init()
        }

        await plugin.run!(context as any)
      },
      abortController.signal,
      this.#pluginTimeout
    )
  }

  #pluginRace(
    fn: (raceSignal: AbortSignal) => Promise<any>,
    pluginSignal: AbortSignal,
    ms?: number
  ) {
    return ms
      ? race(
          (raceSignal) => [fn(raceSignal), timeout(ms, raceSignal)],
          pluginSignal
        )
      : fn(pluginSignal)
  }

  async #mapEnabledPlugins(
    map: (plugin: Plugin, index: number) => Promise<any>,
    pluginNames = [...this.#enabledPlugins]
  ) {
    await Promise.all(
      pluginNames
        .filter((pluginName) => this.#enabledPlugins.has(pluginName))
        .map((pluginName, i) => map(this.#getPlugin(pluginName), i))
    )
  }

  async #mapDependencies(
    plugin: Plugin,
    filter: (plugin: Plugin) => boolean,
    map: (plugin: Plugin) => Promise<any>
  ) {
    const promises = []

    for (const dep of this.#dependencyGraph.dependencies(plugin)) {
      if (filter(dep)) {
        promises.push(map(dep))
      }
    }

    await Promise.all(promises)
  }

  #createInitContext(plugin: Plugin, signal: AbortSignal) {
    return {
      enablePlugins: this.enablePlugins,
      disablePlugins: this.disablePlugins,
      ...this.#createContext(plugin, signal),
      ...((this.#createExtraInitContext &&
        this.#createExtraInitContext(plugin.name)) ||
        {}),
    } as InitContext<MB> & ExtraContext & ExtraInitContext
  }

  #createRunContext<Action extends ActionI, State>(
    plugin: StatefulPlugin<Action, State, any, any>,
    signal: AbortSignal
  ): StatefulContext<MB, Action, State> & ExtraContext & ExtraRunContext

  #createRunContext(
    plugin: Plugin,
    signal: AbortSignal
  ): Context<MB> & ExtraContext & ExtraRunContext

  #createRunContext(plugin: any, signal: AbortSignal) {
    return {
      ...(isStatefulPlugin(plugin)
        ? this.#createStatefulContext(
            plugin,
            plugin.state.reduce,
            plugin.state.initial,
            signal
          )
        : this.#createContext(plugin, signal)),
      ...((this.#createExtraRunContext &&
        this.#createExtraRunContext(plugin)) ||
        {}),
    }
  }

  #createStatefulContext<Action extends ActionI, State>(
    plugin: Plugin,
    reduce: Reducer<Action, State>,
    initial: State,
    signal: AbortSignal
  ): StatefulContext<MB, Action, State> & ExtraContext & ExtraRunContext {
    const context = this.#createContext(plugin, signal)
    const log = context.log instanceof Logger ? context.log : undefined
    return {
      ...context,
      store: new Store<Action, State>(reduce, initial, log),
    }
  }

  #createContext({ name }: Plugin, signal: AbortSignal) {
    return {
      broker: this.#messageBus.broker(name, signal) as MessageBusBroker<MB>,
      signal,
      ...((this.#createExtraContext && this.#createExtraContext(name)) || {}),
    } as Context<MB> & ExtraContext & ExtraRunContext
  }
}
