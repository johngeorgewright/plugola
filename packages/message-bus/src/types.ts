import type Broker from './Broker'
import type MessageBus from './MessageBus'
import type { CancelEvent } from './symbols'
import { L, N } from 'ts-toolbelt'

export type EventsT<T = unknown> = Record<string, T[]>

export type InvokablesT<A = unknown, R = unknown> = Record<
  string,
  { args: A[]; return: R }
>

export type EventGeneratorsT<A = unknown, R = unknown> = Record<
  string,
  { args: A[]; yield: R }
>

export type SubscriberFn<Args extends unknown[]> = (
  ...args: Args
) => void | Promise<void>

export type SubscriberArgs<A extends unknown[], B extends unknown[] = []> =
  L.Length<A> extends 0
    ? [SubscriberFn<B>]
    :
        | L.Append<A, SubscriberFn<B>>
        | SubscriberArgs<L.Pop<A>, L.Append<B, L.Last<A>>>

export type UntilArgs<A extends unknown[]> = L.Length<A> extends 0
  ? never[]
  : UntilArgs<L.Pop<A>> | A

export type UntilRtn<T extends unknown[], Args extends unknown[]> = N.Greater<
  L.Length<Args>,
  0
> extends 1
  ? L.Head<T> extends L.Head<Args>
    ? UntilRtn<L.Tail<T>, L.Tail<Args>>
    : never
  : T

export type Subscribers<Events extends EventsT> = Partial<
  {
    [EventName in keyof Events]: Subscriber<
      Broker<EventsT, EventGeneratorsT, InvokablesT>
    >[]
  }
>

export interface Subscriber<
  B extends Broker<EventsT, EventGeneratorsT, InvokablesT>
> {
  broker: B
  args: unknown[]
  fn: SubscriberFn<unknown[]>
}

export type EventInterceptorFn<
  Args extends unknown[],
  NewArgs extends unknown[]
> = (
  ...args: Args
) =>
  | typeof CancelEvent
  | void
  | NewArgs
  | Promise<typeof CancelEvent | void | NewArgs>

export type EventInterceptorArgs<
  A extends unknown[],
  B extends unknown[] = [],
  C extends unknown[] = A
> = L.Length<A> extends 0
  ? [EventInterceptorFn<B, C>]
  :
      | [...A, EventInterceptorFn<B, C>]
      | EventInterceptorArgs<L.Pop<A>, [L.Last<A>, ...B], C>

export type EventInterceptors<Events extends EventsT> = Partial<
  {
    [EventName in keyof Events]: EventInterceptor<
      Broker<EventsT, EventGeneratorsT, InvokablesT>
    >[]
  }
>

export interface EventInterceptor<
  B extends Broker<EventsT, EventGeneratorsT, InvokablesT>
> {
  broker: B
  args: unknown[]
  fn: EventInterceptorFn<unknown[], unknown[]>
}

export type InvokerFn<Args extends unknown[], Result> = (
  ...args: Args
) => Result | Promise<UnpackResolvableValue<Result>>

export type InvokerRegistrationArgs<
  A extends unknown[],
  Return,
  B extends unknown[] = []
> = L.Length<A> extends 0
  ? [InvokerFn<B, Return>]
  :
      | L.Append<A, InvokerFn<B, Return>>
      | InvokerRegistrationArgs<L.Pop<A>, Return, L.Append<B, L.Last<A>>>

export interface Invoker<
  B extends Broker<EventsT, EventGeneratorsT, InvokablesT>
> {
  broker: B
  args: unknown[]
  fn: InvokerFn<unknown[], unknown>
}

export type Invokers<Invokables extends InvokablesT> = Partial<
  {
    [InvokableName in keyof Invokables]: Invoker<
      Broker<EventsT, EventGeneratorsT, InvokablesT>
    >[]
  }
>

export type InvokerInterceptorFn<
  Args extends unknown[],
  NewArgs extends unknown[]
> = (...args: Args) => void | NewArgs

export type InvokerInterceptorArgs<
  A extends unknown[],
  B extends unknown[] = [],
  C extends unknown[] = A
> = L.Length<A> extends 0
  ? [InvokerInterceptorFn<B, C>]
  :
      | L.Append<A, InvokerInterceptorFn<B, C>>
      | InvokerInterceptorArgs<L.Pop<A>, L.Append<B, L.Last<A>>, C>

export type InvokerInterceptors<Invokables extends InvokablesT> = Partial<
  {
    [InvokableName in keyof Invokables]: InvokerInterceptor<
      Broker<EventsT, EventGeneratorsT, Invokables>
    >[]
  }
>

export interface InvokerInterceptor<
  B extends Broker<EventsT, EventGeneratorsT, InvokablesT>
> {
  broker: B
  args: unknown[]
  fn: InvokerInterceptorFn<unknown[], unknown[]>
}

export type EventGeneratorFn<Args extends unknown[], R> = (
  ...args: Args
) => AsyncIterable<R>

export interface EventGenerator<
  B extends Broker<EventsT, EventGeneratorsT, InvokablesT>
> {
  broker: B
  args: unknown[]
  fn: EventGeneratorFn<unknown[], unknown>
}

export type EventGeneratorArgs<
  A extends unknown[],
  R,
  B extends unknown[] = []
> = L.Length<A> extends 0
  ? [EventGeneratorFn<B, R>]
  :
      | L.Append<A, EventGeneratorFn<B, R>>
      | EventGeneratorArgs<L.Pop<A>, R, L.Append<B, L.Last<A>>>

export type EventGenerators<EventGens extends EventGeneratorsT> = Partial<
  {
    [EventName in keyof EventGens]: EventGenerator<
      Broker<EventsT, EventGeneratorsT, InvokablesT>
    >[]
  }
>

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

export type UnpackResolvableValue<T> = T extends Promise<infer R>
  ? UnpackResolvableValue<R>
  : T
