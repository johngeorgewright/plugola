import { isStatefulPlugin, Plugin, StatefulePlugin } from './Plugin'
import Store, { ActionI, InitAction } from '@plugola/store'
import createLogger from './createLogger'

export function isStatefulContext(
  context: any
): context is StatefulContext<any, any> {
  return !!context.store
}

export function createInitContext(pluginName: string): InitContext {
  return {
    ...createContext(pluginName),
    addPlugins: () => {},
    removePlugins: () => {},
    registerPluginBouncer: () => {},
    checkPluginBouncer: async () => true,
  }
}

export function createRunContext<Action extends ActionI, State>(
  pluginName: string,
  plugin: StatefulePlugin<Action, State>
): StatefulContext<Action, Context>
export function createRunContext(pluginName: string, plugin: Plugin): Context
export function createRunContext(
  pluginName: string,
  plugin: Plugin | StatefulePlugin<any, any>
) {
  return isStatefulPlugin(plugin)
    ? createStatefulContext(pluginName, plugin)
    : createContext(pluginName)
}

function createContext(pluginName: string): Context {
  return {
    broker: {},
    doc: document,
    getConfig: () => {},
    setConfig: () => {},
    log: createLogger(pluginName),
    ownName: pluginName,
    queryParams: {},
    win: window,
  }
}

function createStatefulContext<Action extends ActionI, State>(
  pluginName: string,
  plugin: StatefulePlugin<Action | InitAction, State>
) {
  const context = createContext(pluginName)
  return {
    ...context,
    store: new Store<Action, State>(
      plugin.state.reduce,
      plugin.state.initial,
      context.log.extend('store')
    ),
  }
}

export interface Context {
  broker: any
  doc: Document
  getConfig(name: string, dflt?: any): unknown
  setConfig(name: string, value: unknown): void
  log: any
  ownName: string
  queryParams: Record<string, any>
  win: Window
}

export interface InitContext {
  addPlugins(pluginNames: string[]): void
  removePlugins(pluginNames: string[]): void
  registerPluginBouncer(bouncer: Bouncer): void
  checkPluginBouncer(name: string, plugin: Plugin): Promise<boolean>
}

export type Bouncer = (
  name: string,
  plugin: Plugin
) => boolean | Promise<boolean>

export interface StatefulContext<Action extends ActionI, State>
  extends Context {
  store: Store<Action, State>
}
