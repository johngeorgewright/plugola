import type { MessageBus, MessageBusBroker } from '@plugola/message-bus'
import { Store, BaseActions } from '@plugola/store'
import type { AbortSignal } from 'node-abort-controller'

export function isStatefulContext(
  context: any
): context is StatefulContext<any, any, any> {
  return !!context.store
}

export interface RunContext<MB extends MessageBus> {
  broker: MessageBusBroker<MB>
  signal: AbortSignal
}

export interface InitContext<MB extends MessageBus> {
  broker: MessageBusBroker<MB>
  signal: AbortSignal
  enablePlugins(pluginNames: string[]): Promise<void>
  disablePlugins(pluginNames: string[]): void
}

export interface StatefulContext<
  MB extends MessageBus,
  Actions extends BaseActions = BaseActions,
  State = any
> {
  broker: MessageBusBroker<MB>
  signal: AbortSignal
  store: Store<Actions, State>
}
