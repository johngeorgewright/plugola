import type { Broker } from '@plugola/message-bus'
import Store, { ActionI } from '@plugola/store'

export function isStatefulContext(
  context: any
): context is StatefulContext<Broker, any, any> {
  return !!context.store
}

export interface Context<B extends Broker> {
  broker: B
  doc: Document
  getConfig(name: string, dflt?: any): unknown
  setConfig(name: string, value: unknown): void
  log: any
  ownName: string
  queryParams: Record<string, any>
  win: Window
}

export interface InitContext<B extends Broker> extends Context<B> {
  addPlugins(pluginNames: string[]): void
  removePlugins(pluginNames: string[]): void
}

export interface StatefulContext<
  B extends Broker,
  Action extends ActionI,
  State
> extends Context<B> {
  store: Store<Action, State>
}
