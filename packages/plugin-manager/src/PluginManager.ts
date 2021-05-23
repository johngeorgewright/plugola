import {
  Context,
  InitContext,
  isStatefulContext,
  StatefulContext,
} from './Context'
import { isStatefulPlugin, Plugin, StatefulPlugin } from './Plugin'
import Store, { ActionI } from '@plugola/store'
import type { MessageBus } from '@plugola/message-bus'
import createLogger from './createLogger'
import { MessageBusBroker } from '@plugola/message-bus/dist/types'

interface Options<
  ExtraContext extends Record<string, unknown>,
  ExtraInitContext extends Record<string, unknown>
> {
  addContext?(pluginName: string): ExtraContext
  addInitContext?(pluginName: string): ExtraInitContext
}

export default class PluginManager<
  MB extends MessageBus,
  ExtraContext extends Record<string, unknown> = {},
  ExtraInitContext extends Record<string, unknown> = {}
> {
  private plugins: Record<
    string,
    | Plugin<InitContext<MB>, Context<MB>>
    | StatefulPlugin<any, any, InitContext<MB>, StatefulContext<MB, any, any>>
  > = {}
  private initialized: Record<string, Promise<void>> = {}
  private ran: Record<string, Promise<void>> = {}
  private messageBus: MB
  private createExtraContext?: (pluginName: string) => ExtraContext
  private createExtraInitContext?: (pluginName: string) => ExtraInitContext

  constructor(
    messageBus: MB,
    {
      addContext: createExtraContext,
      addInitContext: createExtraInitContext,
    }: Options<ExtraContext, ExtraInitContext> = {}
  ) {
    this.messageBus = messageBus
    this.createExtraContext = createExtraContext
    this.createExtraInitContext = createExtraInitContext
  }

  registerStatefulPlugin<Action extends ActionI, State>(
    name: string,
    plugin: StatefulPlugin<
      Action,
      State,
      InitContext<MB> & ExtraContext,
      StatefulContext<MB, Action, State> & ExtraContext
    >
  ) {
    this.plugins[name] = plugin
  }

  registerPlugin(
    name: string,
    plugin: Plugin<
      InitContext<MB> & ExtraInitContext,
      Context<MB> & ExtraContext
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
    await Promise.all(Object.keys(this.plugins).map(map))
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

  protected createInitContext(pluginName: string) {
    return {
      ...this.createContext(pluginName),
      addPlugins: () => {},
      removePlugins: () => {},
      ...((this.createExtraInitContext &&
        this.createExtraInitContext(pluginName)) ||
        {}),
    }
  }

  protected createRunContext<Action extends ActionI, State>(
    pluginName: string,
    plugin: StatefulPlugin<
      Action,
      State,
      InitContext<MB>,
      StatefulContext<MB, Action, State>
    >
  ): StatefulContext<MB, Action, State>

  protected createRunContext(
    pluginName: string,
    plugin: Plugin<InitContext<MB>, Context<MB>>
  ): Context<MB>

  protected createRunContext(
    pluginName: string,
    plugin:
      | Plugin<InitContext<MB>, Context<MB>>
      | StatefulPlugin<any, any, any, any>
  ): any {
    return isStatefulPlugin(plugin)
      ? this.createStatefulContext(pluginName, plugin)
      : this.createContext(pluginName)
  }

  protected createContext(pluginName: string) {
    return {
      broker: this.messageBus.broker(pluginName) as MessageBusBroker<MB>,
      log: createLogger(pluginName),
      ...((this.createExtraContext && this.createExtraContext(pluginName)) ||
        {}),
    }
  }

  protected createStatefulContext<Action extends ActionI, State>(
    pluginName: string,
    plugin: StatefulPlugin<
      Action,
      State,
      InitContext<MB>,
      StatefulContext<MB, Action, State>
    >
  ) {
    const context = this.createContext(pluginName)
    return {
      ...context,
      store: new Store<Action, State>(
        plugin.state.reduce,
        plugin.state.initial,
        context.log.extend('store')
      ),
    }
  }
}
