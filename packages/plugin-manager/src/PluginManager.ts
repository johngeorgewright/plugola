import {
  Context,
  InitContext,
  isStatefulContext,
  StatefulContext,
} from './Context'
import { isStatefulPlugin, Plugin, StatefulPlugin } from './Plugin'
import Store, { ActionI, Reducer } from '@plugola/store'
import type { MessageBus, MessageBusBroker } from '@plugola/message-bus'
import createLogger from './createLogger'
import Logger from '@plugola/logger'
import { detonateRace } from '@johngw/async'
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
  #plugins = new DependencyGraph<Plugin>()
  #initialized = new Set<Plugin>()
  #ran = new Set<Plugin>()
  #abortControllers = new WeakMap<Plugin, AbortController>()

  #messageBus: MB
  #enabledPlugins: Set<string> = new Set()
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
    this.#plugins.vertex(plugin)
    const dependencies = plugin.dependencies || []
    for (const dependency of dependencies) {
      this.#plugins.addDependency(plugin, this.#getPlugin(dependency))
    }
  }

  async run() {
    await this.#mapEnabledPlugins((plugin) => this.#runPlugin(plugin))
  }

  async enableAllPlugins() {
    await this.enablePlugins([...this.#plugins.names()])
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
    for (const pluginName of pluginNames) {
      for (const dep of this.#plugins.dependencies(
        this.#getPlugin(pluginName)
      )) {
        this.#disablePlugin(dep)
      }
    }
  }

  #disablePlugin(plugin: Plugin) {
    if (!this.#enabledPlugins.has(plugin.name)) {
      return
    }

    if (this.#isDependencyOfEnabledPlugin(plugin))
      throw new Error(
        'Cannot disable a plugin that is a dependency of an enabled plugin.'
      )

    this.#enabledPlugins.delete(plugin.name)
    this.#abortControllers.get(plugin)?.abort()
    this.#abortControllers.delete(plugin)
  }

  #isDependencyOfEnabledPlugin(dependency: Plugin) {
    for (const plugin of this.#plugins.whichDependOn(dependency)) {
      if (
        plugin.name !== dependency.name &&
        this.#enabledPlugins.has(plugin.name)
      )
        return true
    }
    return false
  }

  #getPlugin(pluginName: string) {
    try {
      return this.#plugins.find(({ name }) => name === pluginName)
    } catch (error) {
      throw new Error(`The plugin "${pluginName}" isn't registered.`)
    }
  }

  #abortController(plugin: Plugin) {
    if (!this.#abortControllers.has(plugin)) {
      const abortController = new AbortController()
      abortController.signal.addEventListener('abort', () => {
        this.#initialized.delete(plugin)
        this.#ran.delete(plugin)
      })
      this.#abortControllers.set(plugin, abortController)
    }
    return this.#abortControllers.get(plugin)!
  }

  async #initPlugin(plugin: Plugin) {
    if (this.#initialized.has(plugin) || !plugin.init) {
      return
    }

    const abortController = this.#abortController(plugin)
    const context = this.#createInitContext(plugin, abortController)

    this.#initialized.add(plugin)

    await this.#pluginRace(abortController, async () => {
      await this.#mapDependencies(
        plugin,
        (dep) => !this.#initialized.has(dep),
        (dep) => this.#initPlugin(dep)
      )

      await plugin.init!(context)
    })
  }

  async #runPlugin(plugin: Plugin) {
    if (this.#ran.has(plugin) || !plugin.run) {
      return
    }

    const abortController = this.#abortController(plugin)
    const context = this.#createRunContext(plugin, abortController)

    this.#ran.add(plugin)

    await this.#pluginRace(abortController, async () => {
      await this.#mapDependencies(
        plugin,
        (dep) => !this.#ran.has(dep),
        (dep) => this.#runPlugin(dep)
      )

      if (isStatefulContext(context)) {
        // @ts-ignore
        context.store.init()
      }

      await plugin.run!(context as any)
    })
  }

  #pluginRace(abortController: AbortController, fn: () => Promise<any>) {
    return this.#pluginTimeout
      ? detonateRace(fn(), this.#pluginTimeout).catch((error) => {
          abortController.abort()
          if (!error.isTimeoutError) {
            throw error
          }
        })
      : fn()
  }

  async #mapEnabledPlugins(
    map: (plugin: Plugin, index: number) => Promise<any>,
    pluginNames: string[] = [...this.#enabledPlugins]
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

    for (const dep of this.#plugins.dependencies(plugin)) {
      if (filter(dep)) {
        promises.push(map(dep))
      }
    }

    await Promise.all(promises)
  }

  #createInitContext(plugin: Plugin, abortController: AbortController) {
    return {
      enablePlugins: this.enablePlugins,
      disablePlugins: this.disablePlugins,
      ...this.#createContext(plugin, abortController),
      ...((this.#createExtraInitContext &&
        this.#createExtraInitContext(plugin.name)) ||
        {}),
    } as InitContext<MB> & ExtraContext & ExtraInitContext
  }

  #createRunContext<Action extends ActionI, State>(
    plugin: StatefulPlugin<Action, State, any, any>,
    abortController: AbortController
  ): StatefulContext<MB, Action, State> & ExtraContext & ExtraRunContext

  #createRunContext(
    plugin: Plugin,
    abortController: AbortController
  ): Context<MB> & ExtraContext & ExtraRunContext

  #createRunContext(plugin: any, abortController: AbortController) {
    return {
      ...(isStatefulPlugin(plugin)
        ? this.#createStatefulContext(
            plugin,
            plugin.state.reduce,
            plugin.state.initial,
            abortController
          )
        : this.#createContext(plugin, abortController)),
      ...((this.#createExtraRunContext &&
        this.#createExtraRunContext(plugin)) ||
        {}),
    }
  }

  #createStatefulContext<Action extends ActionI, State>(
    plugin: Plugin,
    reduce: Reducer<Action, State>,
    initial: State,
    abortController: AbortController
  ): StatefulContext<MB, Action, State> & ExtraContext & ExtraRunContext {
    const context = this.#createContext(plugin, abortController)
    const log = context.log instanceof Logger ? context.log : undefined
    return {
      ...context,
      store: new Store<Action, State>(reduce, initial, log),
    }
  }

  #createContext(
    { name }: Plugin,
    abortController: AbortController
  ): Context<MB> & ExtraContext & ExtraRunContext {
    return {
      broker: this.#messageBus.broker(name) as MessageBusBroker<MB>,
      log: createLogger(name),
      signal: abortController.signal,
      ...((this.#createExtraContext && this.#createExtraContext(name)) || {}),
    } as Context<MB> & ExtraContext & ExtraRunContext
  }
}
