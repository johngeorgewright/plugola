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

/**
 * Create a `.register` argument union from a list of arguments and a return type.
 *
 * @example
 * type Args = InvokerRegistrationArgs<[string, number], string>
 * // | [string, number, InvokerFn<[], string>]
 * // | [string, InvokerFn<[number], string>]
 * // | [InvokerFn<[string, number], string>]
 */
export type InvokerRegistrationArgs<
  A extends unknown[],
  Return
> = _InvokerRegistrationArgs<A, Return, [], [InvokerFn<A, Return>]>

type _InvokerRegistrationArgs<
  A extends unknown[],
  Return,
  B extends unknown[],
  Acc extends unknown[]
> = L.Length<A> extends 0
  ? Acc
  : _InvokerRegistrationArgs<
      L.Pop<A>,
      Return,
      L.Prepend<B, L.Last<A>>,
      L.Append<A, InvokerFn<B, Return>> | Acc
    >

export interface Invoker {
  args: unknown[]
  fn: InvokerFn<unknown[], unknown>
}

export type Invokers<Invokables extends InvokablesDict> = Partial<{
  [InvokableName in keyof Invokables]: Invoker[]
}>

export type Unsubscriber = () => void
