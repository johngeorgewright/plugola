import type Broker from '../Broker'
import type { L } from 'ts-toolbelt'
import type { AddAbortSignal } from './MessageBus'

export type EventGeneratorsT = Record<
  string,
  { args: unknown[]; yield: unknown }
>

export type EventGeneratorFn<Args extends unknown[], R> = (
  ...args: AddAbortSignal<Args>
) => AsyncIterable<R>

export interface EventGenerator<B extends Broker> {
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
      | EventGeneratorArgs<L.Pop<A>, R, L.Prepend<B, L.Last<A>>>

export type EventGenerators<EventGens extends EventGeneratorsT> = Partial<{
  [EventName in keyof EventGens]: EventGenerator<Broker>[]
}>
