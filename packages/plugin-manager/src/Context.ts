import type { MessageBus } from '@plugola/message-bus'
import { MessageBusBroker } from '@plugola/message-bus/dist/types'
import Store, { ActionI } from '@plugola/store'

export function isStatefulContext(
  context: any
): context is StatefulContext<MessageBus, any, any> {
  return !!context.store
}

export interface Context<MB extends MessageBus> {
  broker: MessageBusBroker<MB>
  log: any
}

export interface InitContext<MB extends MessageBus> extends Context<MB> {
  enablePlugins(pluginNames: string[]): void
  disablePlugins(pluginNames: string[]): void
}

export interface StatefulContext<
  MB extends MessageBus,
  Action extends ActionI,
  State
> extends Context<MB> {
  store: Store<Action, State>
}
