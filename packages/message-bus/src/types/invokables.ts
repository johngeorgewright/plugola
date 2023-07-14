import type { InvokablesDict, InvokerFn } from '@plugola/invoke'
import type Broker from '../Broker'
import type { L } from 'ts-toolbelt'

export {
  CreateInvokablesDict,
  InvokablesDict,
  InvokerFn,
  InvokerRegistrationArgs,
} from '@plugola/invoke'

export interface Invoker<B extends Broker, Args extends unknown[], Return> {
  broker: B
  args: Args
  fn: InvokerFn<Args, Return>
}

export type Invokers<Invokables extends InvokablesDict> = Partial<{
  [InvokableName in keyof Invokables]: Invoker<
    Broker,
    Invokables[InvokableName]['args'],
    Invokables[InvokableName]['return']
  >[]
}>

export type InvokerInterceptorFn<Args extends unknown[], Return> = (
  next: (...args: Args) => Promise<Return>,
  ...args: Args
) => Return | Promise<Return>

export type InvokerInterceptorArgs<
  A extends unknown[],
  Return
> = _InvokerInterceptorArgs<A, Return, A, [InvokerInterceptorFn<A, Return>]>

export type _InvokerInterceptorArgs<
  A extends unknown[],
  Return,
  B extends unknown[],
  Acc extends unknown[]
> = L.Length<A> extends 0
  ? Acc
  : _InvokerInterceptorArgs<
      L.Pop<A>,
      Return,
      B,
      Acc | L.Append<A, InvokerInterceptorFn<B, Return>>
    >

export type InvokerInterceptors<Invokables extends InvokablesDict> = Partial<{
  [InvokableName in keyof Invokables]: InvokerInterceptor<Broker>[]
}>

export interface InvokerInterceptor<B extends Broker> {
  broker: B
  args: unknown[]
  fn: InvokerInterceptorFn<unknown[], unknown>
}
