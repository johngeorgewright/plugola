import type Broker from './Broker'
import type { CancelEvent } from './symbols'
import { L, N } from 'ts-toolbelt'

export type EventsT<T = unknown> = Record<string, T[]>

export type InvokablesT<A = unknown, R = unknown> = Record<
  string,
  { args: A[]; return: R }
>

export type SubscriberFn<Args extends unknown[]> = (
  ...args: Args
) => void | Promise<void>

export type SubscriberArgs<A extends unknown[], B extends unknown[] = []> =
  L.Length<A> extends 0
    ? [SubscriberFn<B>]
    : [...A, SubscriberFn<B>] | SubscriberArgs<L.Pop<A>, [L.Last<A>, ...B]>

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
    [EventName in keyof Events]: Subscriber<Broker<EventsT, InvokablesT>>[]
  }
>

export interface Subscriber<B extends Broker<EventsT, InvokablesT>> {
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
      Broker<EventsT, InvokablesT>
    >[]
  }
>

export interface EventInterceptor<B extends Broker<EventsT, InvokablesT>> {
  broker: B
  args: unknown[]
  fn: EventInterceptorFn<unknown[], unknown[]>
}

export type InvokerFn<Args extends unknown[], Result> = (
  ...args: Args
) => Result

export type InvokerArgs<A extends unknown[], Return, B extends unknown[] = []> =
  L.Length<A> extends 0
    ? [InvokerFn<B, Return>]
    :
        | [...A, InvokerFn<B, Return>]
        | InvokerArgs<L.Pop<A>, Return, [L.Last<A>, ...B]>

export interface Invoker<B extends Broker<EventsT, InvokablesT>> {
  broker: B
  args: unknown[]
  fn: InvokerFn<unknown[], unknown>
}

export type Invokers<Invokables extends InvokablesT> = Partial<
  {
    [InvokableName in keyof Invokables]: Invoker<Broker<EventsT, Invokables>>[]
  }
>

export type InvokerInterceptorFn<
  Args extends unknown[],
  Return,
  NewArgs extends unknown[]
> = (
  ...args: Args
) => Return extends Promise<unknown>
  ? void | NewArgs | Promise<void | NewArgs>
  : void | NewArgs

export type InvokerInterceptorArgs<
  A extends unknown[],
  R,
  B extends unknown[] = [],
  C extends unknown[] = A
> = L.Length<A> extends 0
  ? [InvokerInterceptorFn<B, R, C>]
  :
      | [...A, InvokerInterceptorFn<B, R, C>]
      | InvokerInterceptorArgs<L.Pop<A>, R, [L.Last<A>, ...B], C>

export type InvokerInterceptors<Invokables extends InvokablesT> = Partial<
  {
    [InvokableName in keyof Invokables]: InvokerInterceptor<
      Broker<EventsT, Invokables>
    >[]
  }
>

export interface InvokerInterceptor<B extends Broker<EventsT, InvokablesT>> {
  broker: B
  args: unknown[]
  fn: InvokerInterceptorFn<unknown[], unknown, unknown[]>
}

export type UnpackResolvableValue<T> = T extends Promise<infer R>
  ? UnpackResolvableValue<R>
  : T
