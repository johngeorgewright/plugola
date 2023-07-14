import type Broker from '../Broker'
import type { L } from 'ts-toolbelt'
import type { AddAbortSignal } from './MessageBus'

export type EventGeneratorsT = Record<
  string,
  { args: unknown[]; yield: unknown }
>

export type CreateEventGenerators<T extends EventGeneratorsT> = T

export type EventGeneratorFn<Args extends unknown[], R> = (
  ...args: AddAbortSignal<Args>
) => AsyncIterable<R>

export interface EventGenerator<B extends Broker> {
  broker: B
  args: unknown[]
  fn: EventGeneratorFn<unknown[], unknown>
}

export type EventGeneratorArgs<A extends unknown[], R> = _EventGeneratorArgs<
  A,
  R,
  [],
  [EventGeneratorFn<A, R>]
>

export type _EventGeneratorArgs<
  A extends unknown[],
  R,
  B extends unknown[],
  Acc extends unknown[]
> = L.Length<A> extends 0
  ? Acc
  : _EventGeneratorArgs<
      L.Pop<A>,
      R,
      L.Prepend<B, L.Last<A>>,
      Acc | L.Append<A, EventGeneratorFn<B, R>>
    >

export type EventGenerators<EventGens extends EventGeneratorsT> = Partial<{
  [EventName in keyof EventGens]: EventGenerator<Broker>[]
}>
