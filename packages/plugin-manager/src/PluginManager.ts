import {
  Context,
  InitContext,
  isStatefulContext,
  StatefulContext,
} from './Context'
import { isStatefulPlugin, Plugin, StatefulPlugin } from './Plugin'
import Store, { ActionI } from '@plugola/store'
import type { Broker, MessageBus } from '@plugola/message-bus'
import {
  EventGeneratorsT,
  EventsT,
  InvokablesT,
  MessageBusEventGenerators,
  MessageBusEvents,
  MessageBusInvokers,
} from '@plugola/message-bus/dist/types'
import createLogger from './createLogger'

export default class PluginManager<
  MB extends MessageBus<EventsT, EventGeneratorsT, InvokablesT>,
  Events extends EventsT = MessageBusEvents<MB>,
  EventGenerators extends EventGeneratorsT = MessageBusEventGenerators<MB>,
  Invokables extends InvokablesT = MessageBusInvokers<MB>,
  B extends Broker = Broker<Events, EventGenerators, Invokables>,
  C extends Context<Broker> = Context<B>,
  IC extends InitContext<Broker> = InitContext<B>
> {
  private plugins: Record<
    string,
    Plugin<IC, C> | StatefulPlugin<any, any, IC, StatefulContext<B, any, any>>
  > = {}
  private initialized: Record<string, Promise<void>> = {}
  private ran: Record<string, Promise<void>> = {}
  private messageBus: MB

  constructor(messageBus: MB) {
    this.messageBus = messageBus
  }

  registerStatefulPlugin<Action extends ActionI, State>(
    name: string,
    plugin: StatefulPlugin<Action, State, IC, StatefulContext<B, Action, State>>
  ) {
    this.plugins[name] = plugin
  }

  registerPlugin(name: string, plugin: Plugin<IC, C>) {
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
        return plugin.init(this.createInitContext(pluginName, this.messageBus))
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
        const context = this.createRunContext(
          pluginName,
          this.messageBus,
          plugin as any
        )
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

  private createInitContext(pluginName: string, messageBus: MB): IC {
    return {
      ...this.createContext(pluginName, messageBus),
      addPlugins: () => {},
      removePlugins: () => {},
    } as any
  }

  private createRunContext<Action extends ActionI, State>(
    pluginName: string,
    messageBus: MB,
    plugin: StatefulPlugin<Action, State, IC, StatefulContext<B, Action, State>>
  ): StatefulContext<B, Action, State>

  private createRunContext(
    pluginName: string,
    messageBus: MB,
    plugin: Plugin<IC, C>
  ): Context<B>

  private createRunContext(
    pluginName: string,
    messageBus: MB,
    plugin: Plugin<IC, C> | StatefulPlugin<any, any, any, any>
  ): any {
    return isStatefulPlugin(plugin)
      ? this.createStatefulContext(pluginName, messageBus, plugin)
      : this.createContext(pluginName, messageBus)
  }

  private createContext(pluginName: string, messageBus: MB): C {
    return {
      broker: messageBus.broker(pluginName),
      doc: document,
      getConfig: () => {},
      setConfig: () => {},
      log: createLogger(pluginName),
      ownName: pluginName,
      queryParams: {},
      win: window,
    } as any
  }

  private createStatefulContext<Action extends ActionI, State>(
    pluginName: string,
    messageBus: MB,
    plugin: StatefulPlugin<Action, State, IC, StatefulContext<B, Action, State>>
  ) {
    const context = this.createContext(pluginName, messageBus)
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
