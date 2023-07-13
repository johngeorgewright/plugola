import { InvokablesDict, InvokerFn } from '@plugola/invoke'
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

export type InvokerInterceptors<Invokables extends InvokablesDict> = Partial<{
  [InvokableName in keyof Invokables]: InvokerInterceptor<Broker>[]
}>

export interface InvokerInterceptor<B extends Broker> {
  broker: B
  args: unknown[]
  fn: InvokerInterceptorFn<unknown[], unknown[]>
}
