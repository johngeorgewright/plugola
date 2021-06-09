import type Broker from '../Broker'
import type { CancelEvent } from '../symbols'
import { L, N } from 'ts-toolbelt'

export type EventsT = Record<string, unknown[]>

export type SubscriberFn<Args extends unknown[]> = (
  ...args: Args
) => void | Promise<void>

export type SubscriberArgs<
  A extends unknown[],
  B extends unknown[] = []
> = L.Length<A> extends 0
  ? [SubscriberFn<B>]
  :
      | L.Append<A, SubscriberFn<B>>
      | SubscriberArgs<L.Pop<A>, L.Prepend<B, L.Last<A>>>

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
    [EventName in keyof Events]: Subscriber<Broker>[]
  }
>

export interface Subscriber<B extends Broker> {
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
      | EventInterceptorArgs<L.Pop<A>, L.Prepend<B, L.Last<A>>, C>

export type EventInterceptors<Events extends EventsT> = Partial<
  {
    [EventName in keyof Events]: EventInterceptor<Broker>[]
  }
>

export interface EventInterceptor<B extends Broker> {
  broker: B
  args: unknown[]
  fn: EventInterceptorFn<unknown[], unknown[]>
}
