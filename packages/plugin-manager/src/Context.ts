import type { MessageBus, MessageBusBroker } from '@plugola/message-bus'
import { Store, ActionI } from '@plugola/store'
import type { AbortSignal } from 'node-abort-controller'

export function isStatefulContext(
  context: any
): context is StatefulContext<any, any, any> {
  return !!context.store
}

export interface Context<MB extends MessageBus> {
  signal: AbortSignal
  broker: MessageBusBroker<MB>
}

export interface InitContext<MB extends MessageBus> extends Context<MB> {
  enablePlugins(pluginNames: string[]): Promise<void>
  disablePlugins(pluginNames: string[]): void
}

export interface StatefulContext<
  MB extends MessageBus,
  Action extends ActionI = any,
  State = any
> extends Context<MB> {
  store: Store<Action, State>
}
