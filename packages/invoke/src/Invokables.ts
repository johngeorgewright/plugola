import { L } from 'ts-toolbelt'
import { init, last, removeItem } from './array.js'
import { AbortError } from './errors/AbortError.js'
import { InvokableRegisteredError } from './errors/InvokableRegisteredError.js'
import { InvokableNotRegisteredError } from './errors/InvokableNotRegisteredError.js'
import {
  InvokablesDict,
  InvokerFn,
  InvokerRegistrationArgs,
  Invokers,
  Unsubscriber,
} from './types.js'

export class Invokables<Dict extends InvokablesDict> {
  #invokers: Invokers<Dict> = {}
  #started = false
  #queued: Array<() => unknown> = []

  async start() {
    this.#started = true
    return Promise.all(this.#queued.map((handle) => handle()))
  }

  register<InvokableName extends keyof Dict>(
    invokableName: InvokableName,
    ...allArgs: InvokerRegistrationArgs<
      Dict[InvokableName]['args'],
      Dict[InvokableName]['return']
    >
  ): Unsubscriber {
    const args = init(allArgs)
    const fn = last(allArgs) as InvokerFn<
      Dict[InvokableName]['args'],
      Dict[InvokableName]['return']
    >
    const invokers = this.#invokers[invokableName] || []
    const registeredInvoker = invokers!.find(
      (invoker) => this.#argumentIndex(invoker.args, args) !== -1
    )

    if (registeredInvoker)
      throw new InvokableRegisteredError(invokableName.toString(), args)

    const subscriber = {
      args,
      fn,
    }

    this.#invokers[invokableName] = [...invokers!, subscriber]

    const cancel = () => {
      this.#invokers[invokableName] = removeItem(
        subscriber,
        this.#invokers[invokableName] as any
      )
    }

    return cancel
  }

  async invoke<InvokableName extends keyof Dict>(
    invokableName: InvokableName,
    abortSignal: AbortSignal,
    ...args: Dict[InvokableName]['args']
  ): Promise<Dict[InvokableName]['return']>

  async invoke<InvokableName extends keyof Dict>(
    invokableName: InvokableName,
    ...args: Dict[InvokableName]['args']
  ): Promise<Dict[InvokableName]['return']>

  async invoke<InvokableName extends keyof Dict>(
    invokableName: InvokableName,
    abortSignalOrFirstArg: AbortSignal | Dict[InvokableName]['args'][0],
    ...restOfArgs:
      | Dict[InvokableName]['args']
      | L.Tail<Dict[InvokableName]['args']>
  ): Promise<Dict[InvokableName]['return']> {
    const abortSignal =
      abortSignalOrFirstArg instanceof AbortSignal
        ? (abortSignalOrFirstArg as AbortSignal)
        : undefined

    const args =
      abortSignalOrFirstArg instanceof AbortSignal
        ? restOfArgs
        : [abortSignalOrFirstArg, ...restOfArgs]

    const handle = () =>
      new Promise(async (resolve, reject) => {
        if (abortSignal?.aborted) return reject(new AbortError())
        abortSignal?.addEventListener('abort', () => reject(new AbortError()))

        resolve(this.#callInvoker(invokableName, args, abortSignal))
      })

    return this.#started ? handle() : this.#queue(handle, abortSignal)
  }

  #argumentIndex(args1: ArrayLike<unknown>, args2: ArrayLike<unknown>) {
    if (!args1.length) return 0
    else if (args1.length > args2.length) return -1

    let i = 0
    for (; i < args1.length; i++) if (args1[i] !== args2[i]) return -1
    return i
  }

  async #callInvoker<InvokableName extends keyof Dict>(
    invokableName: InvokableName,
    args: Dict[InvokableName]['args'],
    abortSignal: AbortSignal = new AbortController().signal
  ): Promise<Dict[InvokableName]['return']> {
    const invokers = this.#invokers[invokableName]
    const invoker =
      invokers &&
      invokers.find((invoker) => this.#argumentIndex(invoker.args, args) !== -1)

    if (!invoker) {
      throw new InvokableNotRegisteredError(invokableName.toString())
    }

    return invoker.fn(
      ...args.slice(this.#argumentIndex(invoker.args, args)),
      abortSignal
    )
  }

  async #queue<T>(handler: () => T, abortSignal?: AbortSignal) {
    return new Promise<Awaited<T>>((resolve, reject) => {
      if (abortSignal?.aborted) return reject(new AbortError())

      const fn = () => resolve(handler() as Awaited<T>)
      this.#queued.push(fn)

      abortSignal?.addEventListener('abort', () => {
        this.#queued = removeItem(fn, this.#queued)
        reject(new AbortError())
      })
    })
  }
}
