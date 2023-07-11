import type { L } from 'ts-toolbelt'

export type AddAbortSignal<Args extends unknown[]> = L.Append<Args, AbortSignal>

export type InvokablesDict = Record<
  string,
  { args: unknown[]; return: unknown }
>

export type CreateInvokablesDict<T extends InvokablesDict> = T

export type InvokerFn<Args extends unknown[], Result> = (
  ...args: AddAbortSignal<Args>
) => Result | Promise<Awaited<Result>>

export type InvokerRegistrationArgs<
  A extends unknown[],
  Return,
  B extends unknown[] = []
> = L.Length<A> extends 0
  ? [InvokerFn<B, Return>]
  :
      | L.Append<A, InvokerFn<B, Return>>
      | InvokerRegistrationArgs<L.Pop<A>, Return, L.Prepend<B, L.Last<A>>>

export interface Invoker {
  args: unknown[]
  fn: InvokerFn<unknown[], unknown>
}

export type Invokers<Invokables extends InvokablesDict> = Partial<{
  [InvokableName in keyof Invokables]: Invoker[]
}>

export type Unsubscriber = () => void
