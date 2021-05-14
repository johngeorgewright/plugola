import type Broker from './Broker'
import type { CancelEvent } from './symbols'
import { L, N } from 'ts-toolbelt'

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

export interface Dispatcher {
  (fn: () => void): void
}

export type EventsT<T = unknown> = Record<string, T[]>

export type Subscribers<Events extends EventsT> = Partial<
  {
    [EventName in keyof Events]: Subscriber<Broker<EventsT>>[]
  }
>

export interface Subscriber<B extends Broker<EventsT>> {
  broker: B
  args: unknown[]
  fn: SubscriberFn<unknown[]>
}

export type InterceptorFn<Args extends unknown[], NewArgs extends unknown[]> = (
  ...args: Args
) =>
  | typeof CancelEvent
  | void
  | NewArgs
  | Promise<typeof CancelEvent | void | NewArgs>

export type InterceptorArgs<
  A extends unknown[],
  B extends unknown[] = [],
  C extends unknown[] = A
> = L.Length<A> extends 0
  ? [InterceptorFn<B, C>]
  :
      | [...A, InterceptorFn<B, C>]
      | InterceptorArgs<L.Pop<A>, [L.Last<A>, ...B], C>

export type Interceptors<Events extends EventsT> = Partial<
  { [EventName in keyof Events]: Interceptor<Broker<EventsT>>[] }
>

export interface Interceptor<B extends Broker<EventsT>> {
  broker: B
  args: unknown[]
  fn: InterceptorFn<unknown[], unknown[]>
}
