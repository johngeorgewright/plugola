import type Broker from '../Broker'
import { L } from 'ts-toolbelt'
import { UnpackResolvableValue } from './util'

export type InvokablesT = Record<string, { args: unknown[]; return: unknown }>

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
      | InvokerRegistrationArgs<L.Pop<A>, Return, L.Prepend<B, L.Last<A>>>

export interface Invoker<B extends Broker> {
  broker: B
  args: unknown[]
  fn: InvokerFn<unknown[], unknown>
}

export type Invokers<Invokables extends InvokablesT> = Partial<
  {
    [InvokableName in keyof Invokables]: Invoker<Broker>[]
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
      | InvokerInterceptorArgs<L.Pop<A>, L.Prepend<B, L.Last<A>>, C>

export type InvokerInterceptors<Invokables extends InvokablesT> = Partial<
  {
    [InvokableName in keyof Invokables]: InvokerInterceptor<Broker>[]
  }
>

export interface InvokerInterceptor<B extends Broker> {
  broker: B
  args: unknown[]
  fn: InvokerInterceptorFn<unknown[], unknown[]>
}
