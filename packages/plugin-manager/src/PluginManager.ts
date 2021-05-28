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
  ExtraRunContext extends Record<string, unknown> = {}
> {
  private plugins: Record<
    string,
    | Plugin<InitContext<MB>, Context<MB>>
    | StatefulPlugin<any, any, InitContext<MB>, StatefulContext<MB, any, any>>
  > = {}
  private initialized: Record<string, Promise<void>> = {}
  private ran: Record<string, Promise<void>> = {}
  private messageBus: MB
  private enabledPlugins: Set<string> = new Set()
  private createExtraContext?: (pluginName: string) => ExtraContext
  private createExtraInitContext?: (pluginName: string) => ExtraInitContext
  private createExtraRunContext?: (pluginName: string) => ExtraRunContext

  constructor(
    messageBus: MB,
    {
      addContext: createExtraContext,
      addInitContext: createExtraInitContext,
      addRunContext: createExtraRunContext,
    }: PluginManagerOptions<
      ExtraContext,
      ExtraInitContext,
      ExtraRunContext
    > = {}
  ) {
    this.messageBus = messageBus
    this.createExtraContext = createExtraContext
    this.createExtraInitContext = createExtraInitContext
    this.createExtraRunContext = createExtraRunContext
  }

  registerStatefulPlugin<Action extends ActionI, State>(
    name: string,
    plugin: StatefulPlugin<
      Action,
      State,
      InitContext<MB> & ExtraContext & ExtraInitContext,
      StatefulContext<MB, Action, State> & ExtraContext & ExtraRunContext
    >
  ) {
    this.plugins[name] = plugin
  }

  registerPlugin(
    name: string,
    plugin: Plugin<
      InitContext<MB> & ExtraContext & ExtraInitContext,
      Context<MB> & ExtraContext & ExtraRunContext
    >
  ) {
    this.plugins[name] = plugin
  }

  async init() {
    this.initialized = {}
    await this.mapPlugins(this.initPlugin)
  }

  async run() {
    this.ran = {}
    await this.mapPlugins(this.runPlugin)
  }

  enableAllPlugins() {
    for (const pluginName in this.plugins) {
      this.enabledPlugins.add(pluginName)
    }
  }

  readonly enablePlugins = (pluginNames: string[]) => {
    for (const pluginName of pluginNames) {
      this.enabledPlugins.add(pluginName)
    }
  }

  readonly disablePlugins = (pluginNames: string[]) => {
    for (const pluginName of pluginNames) {
      this.enabledPlugins.delete(pluginName)
    }
  }

  private initPlugin = async (pluginName: string) => {
    const plugin = this.plugins[pluginName]

    if (this.initialized[pluginName]) {
      return
    }

    this.initialized[pluginName] = (async () => {
      if (plugin.dependencies) {
        await this.mapDependencies(
          plugin.dependencies,
          (dep) => !this.initialized[dep],
          this.initPlugin
        )
      }

      if (plugin.init) {
        return plugin.init(this.createInitContext(pluginName))
      }
    })()

    return this.initialized[pluginName]
  }

  private runPlugin = async (pluginName: string) => {
    const plugin = this.plugins[pluginName]

    if (this.ran[pluginName]) {
      return
    }

    this.ran[pluginName] = (async () => {
      if (plugin.dependencies) {
        await this.mapDependencies(
          plugin.dependencies,
          (dep) => !this.ran[dep],
          this.runPlugin
        )
      }

      if (plugin.run) {
        const context = this.createRunContext(pluginName, plugin)
        if (isStatefulContext(context)) {
          context.store.init()
        }
        return plugin.run(context as any)
      }
    })()

    return this.ran[pluginName]
  }

  private async mapPlugins(map: (pluginName: string) => Promise<any>) {
    await Promise.all(
      Object.keys(this.plugins)
        .filter((pluginName) => this.enabledPlugins.has(pluginName))
        .map(map)
    )
  }

  private async mapDependencies(
    dependencyNames: string[],
    filter: (pluginName: string) => boolean,
    map: (pluginName: string) => Promise<any>
  ) {
    await Promise.all(
      dependencyNames
        .filter((dependency) => {
          if (!this.plugins[dependency]) {
            throw new Error(`Cannot find dependency ${dependency}`)
          }
          return filter(dependency)
        })
        .map(map)
    )
  }

  private createInitContext(pluginName: string) {
    return {
      ...this.createContext(pluginName),
      enablePlugins: this.enablePlugins,
      disablePlugins: this.disablePlugins,
      ...(((this.createExtraInitContext &&
        this.createExtraInitContext(pluginName)) ||
        {}) as ExtraInitContext),
    }
  }

  private createRunContext<Action extends ActionI, State>(
    pluginName: string,
    plugin: StatefulPlugin<
      Action,
      State,
      InitContext<MB>,
      StatefulContext<MB, Action, State>
    >
  ): StatefulContext<MB, Action, State> & ExtraContext & ExtraRunContext

  private createRunContext(
    pluginName: string,
    plugin: Plugin<InitContext<MB>, Context<MB>>
  ): Context<MB> & ExtraContext & ExtraRunContext

  private createRunContext(
    pluginName: string,
    plugin:
      | Plugin<InitContext<MB>, Context<MB>>
      | StatefulPlugin<any, any, any, any>
  ) {
    return {
      ...(isStatefulPlugin(plugin)
        ? this.createStatefulContext(
            pluginName,
            plugin.state.reduce,
            plugin.state.initial
          )
        : this.createContext(pluginName)),
      ...((this.createExtraRunContext &&
        this.createExtraRunContext(pluginName)) ||
        {}),
    }
  }

  private createContext(pluginName: string): Context<MB> & ExtraContext {
    return {
      broker: this.messageBus.broker(pluginName) as MessageBusBroker<MB>,
      log: createLogger(pluginName),
      ...(((this.createExtraContext && this.createExtraContext(pluginName)) ||
        {}) as ExtraContext),
    }
  }

  private createStatefulContext<Action extends ActionI, State>(
    pluginName: string,
    reduce: Reducer<Action, State>,
    initial: State
  ): StatefulContext<MB, Action, State> {
    const context = this.createContext(pluginName)
    return {
      ...context,
      store: new Store<Action, State>(
        reduce,
        initial,
        context.log.extend('store')
      ),
    }
  }
}
