import type { AbortSignal } from 'node-abort-controller'
import { L } from 'ts-toolbelt'
import type Broker from '../Broker'
import type MessageBus from '../MessageBus'

export interface Subscription {
  (): void
}

export type AddAbortSignal<Args extends unknown[]> = L.Append<Args, AbortSignal>

export type MessageBusEvents<MB extends MessageBus> = MB extends MessageBus<
  infer Events,
  any,
  any
>
  ? Events
  : never

export type MessageBusEventGenerators<MB extends MessageBus> =
  MB extends MessageBus<any, infer EventGenerators, any>
    ? EventGenerators
    : never

export type MessageBusInvokers<MB extends MessageBus> = MB extends MessageBus<
  any,
  any,
  infer Invokers
>
  ? Invokers
  : never

export type MessageBusBroker<MB extends MessageBus> = MB extends MessageBus<
  infer Events,
  infer EventGenerators,
  infer Invokables
>
  ? Broker<Events, EventGenerators, Invokables>
  : never
