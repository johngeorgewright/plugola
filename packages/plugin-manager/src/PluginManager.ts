import {
  Context,
  InitContext,
  isStatefulContext,
  StatefulContext,
} from './Context'
import { isStatefulPlugin, Plugin, StatefulPlugin } from './Plugin'
import Store, { ActionI, Reducer } from '@plugola/store'
import type { MessageBus } from '@plugola/message-bus'
import createLogger from './createLogger'
import { MessageBusBroker } from '@plugola/message-bus/dist/types'
import Logger from '@plugola/logger'

export interface PluginManagerOptions<
  ExtraContext extends Record<string, unknown> = {},
  ExtraInitContext extends Record<string, unknown> = {},
  ExtraRunContext extends Record<string, unknown> = {}
> {
  addContext?(pluginName: string): ExtraContext
  addInitContext?(pluginName: string): ExtraInitContext
  addRunContext?(pluginName: string): ExtraRunContext
}

export default class PluginManager<
  MB extends MessageBus,
  ExtraContext extends Record<string, unknown> = {},
  ExtraInitContext extends Record<string, unknown> = {},
  ExtraRunContext extends Record<string, unknown> = {},
  IC extends Record<string, unknown> = InitContext<MB> &
    ExtraContext &
    ExtraInitContext,
  RC extends Record<string, unknown> = Context<MB> &
    ExtraContext &
    ExtraRunContext
> {
  #plugins: Record<
    string,
    | Plugin<IC, RC>
    | StatefulPlugin<any, any, IC, StatefulContext<any, any> & RC>
  > = {}
  #initialized: Record<string, Promise<void>> = {}
  #ran: Record<string, Promise<void>> = {}
  #messageBus: MB
  #enabledPlugins: Set<string> = new Set()
  #createExtraContext?: (pluginName: string) => ExtraContext
  #createExtraInitContext?: (pluginName: string) => ExtraInitContext
  #createExtraRunContext?: (pluginName: string) => ExtraRunContext

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
  }

  registerStatefulPlugin<Action extends ActionI, State>(
    name: string,
    plugin: StatefulPlugin<
      Action,
      State,
      IC,
      StatefulContext<Action, State> & RC
    >
  ) {
    this.#plugins[name] = plugin
  }

  registerPlugin(name: string, plugin: Plugin<IC, RC>) {
    this.#plugins[name] = plugin
  }

  async init() {
    this.#initialized = {}
    await this.#mapPlugins(this.#initPlugin)
  }

  async run() {
    this.#ran = {}
    await this.#mapPlugins(this.#runPlugin)
  }

  enableAllPlugins() {
    for (const pluginName in this.#plugins) {
      this.#enabledPlugins.add(pluginName)
    }
  }

  readonly enablePlugins = (pluginNames: string[]) => {
    for (const pluginName of pluginNames) {
      this.#enabledPlugins.add(pluginName)
    }
  }

  readonly disablePlugins = (pluginNames: string[]) => {
    for (const pluginName of pluginNames) {
      this.#enabledPlugins.delete(pluginName)
    }
  }

  #initPlugin = async (pluginName: string) => {
    const plugin = this.#plugins[pluginName]

    if (this.#initialized[pluginName]) {
      return
    }

    this.#initialized[pluginName] = (async () => {
      if (plugin.dependencies) {
        await this.#mapDependencies(
          plugin.dependencies,
          (dep) => !this.#initialized[dep],
          this.#initPlugin
        )
      }

      if (plugin.init) {
        return plugin.init(this.#createInitContext(pluginName))
      }
    })()

    return this.#initialized[pluginName]
  }

  #runPlugin = async (pluginName: string) => {
    const plugin = this.#plugins[pluginName]

    if (this.#ran[pluginName]) {
      return
    }

    this.#ran[pluginName] = (async () => {
      if (plugin.dependencies) {
        await this.#mapDependencies(
          plugin.dependencies,
          (dep) => !this.#ran[dep],
          this.#runPlugin
        )
      }

      if (plugin.run) {
        const context = this.#createRunContext(pluginName, plugin)
        if (isStatefulContext(context)) {
          context.store.init()
        }
        return plugin.run(context as any)
      }
    })()

    return this.#ran[pluginName]
  }

  async #mapPlugins(map: (pluginName: string) => Promise<any>) {
    await Promise.all(
      Object.keys(this.#plugins)
        .filter((pluginName) => this.#enabledPlugins.has(pluginName))
        .map(map)
    )
  }

  async #mapDependencies(
    dependencyNames: string[],
    filter: (pluginName: string) => boolean,
    map: (pluginName: string) => Promise<any>
  ) {
    await Promise.all(
      dependencyNames
        .filter((dependency) => {
          if (!this.#plugins[dependency]) {
            throw new Error(`Cannot find dependency ${dependency}`)
          }
          return filter(dependency)
        })
        .map(map)
    )
  }

  #createInitContext(pluginName: string) {
    return {
      ...this.#createContext(pluginName),
      enablePlugins: this.enablePlugins,
      disablePlugins: this.disablePlugins,
      ...((this.#createExtraInitContext &&
        this.#createExtraInitContext(pluginName)) ||
        {}),
    } as IC
  }

  #createRunContext<Action extends ActionI, State>(
    pluginName: string,
    plugin: StatefulPlugin<
      Action,
      State,
      IC,
      StatefulContext<Action, State> & RC
    >
  ): StatefulContext<Action, State> & RC

  #createRunContext(pluginName: string, plugin: Plugin<IC, RC>): RC

  #createRunContext(
    pluginName: string,
    plugin: Plugin<IC, RC> | StatefulPlugin<any, any, any, any>
  ) {
    return {
      ...(isStatefulPlugin(plugin)
        ? this.#createStatefulContext(
            pluginName,
            plugin.state.reduce,
            plugin.state.initial
          )
        : this.#createContext(pluginName)),
      ...((this.#createExtraRunContext &&
        this.#createExtraRunContext(pluginName)) ||
        {}),
    }
  }

  #createContext(pluginName: string): RC {
    return {
      broker: this.#messageBus.broker(pluginName) as MessageBusBroker<MB>,
      log: createLogger(pluginName),
      ...(((this.#createExtraContext && this.#createExtraContext(pluginName)) ||
        {}) as ExtraContext),
    } as RC
  }

  #createStatefulContext<Action extends ActionI, State>(
    pluginName: string,
    reduce: Reducer<Action, State>,
    initial: State
  ): StatefulContext<Action, State> & RC {
    const context = this.#createContext(pluginName)
    const log = context.log instanceof Logger ? context.log : undefined
    return {
      ...context,
      store: new Store<Action, State>(reduce, initial, log),
    }
  }
}
