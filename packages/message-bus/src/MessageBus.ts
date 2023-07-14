import { AbortError } from '@johngw/async'
import {
  accumulate,
  combineIterators,
  iteratorRace,
} from '@johngw/async-iterator'
import { init, last, removeItem, replaceLastItem } from './array'
import Broker from './Broker'
import MessageBusError from './MessageBusError'
import { amend } from './object'
import { CancelEvent } from './symbols'
import {
  EventInterceptorArgs,
  EventInterceptors,
  EventsT,
  SubscriberArgs,
  SubscriberFn,
  Subscribers,
  UntilArgs,
  UntilRtn,
} from './types/events'
import {
  EventGeneratorArgs,
  EventGenerators,
  EventGeneratorsT,
} from './types/generators'
import {
  InvokerInterceptorArgs,
  InvokerInterceptors,
  Invokers,
} from './types/invokables'
import { Stringable, UnpackResolvableValue } from './types/util'
import { ErrorHandler, Unsubscriber } from './types/MessageBus'
import { AbortSignalComposite, fromSignal } from './AbortController'
import { InvokableNotRegisteredError } from './errors/InvokableNotRegisteredError'
import {
  InvokablesDict,
  InvokerFn,
  InvokerRegistrationArgs,
} from '@plugola/invoke'

export default class MessageBus<
  Events extends EventsT = EventsT,
  EventGens extends EventGeneratorsT = EventGeneratorsT,
  Invokables extends InvokablesDict = InvokablesDict
> {
  #errorHandlers: ErrorHandler[] = []
  #eventInterceptors: EventInterceptors<Events> = {}
  #eventGenerators: EventGenerators<EventGens> = {}
  #invokers: Invokers<Invokables> = {}
  #invokerInterceptors: InvokerInterceptors<Invokables> = {}
  #queued: Array<() => unknown> = []
  #started = false
  #subscribers: Subscribers<Events> = {}

  onError(errorHandler: ErrorHandler) {
    this.#errorHandlers.push(errorHandler)
    return () => {
      this.#errorHandlers = removeItem(errorHandler, this.#errorHandlers)
    }
  }

  #reportError(brokerId: string, eventName: Stringable, error: Error) {
    for (const errorHandler of this.#errorHandlers)
      errorHandler(new MessageBusError(brokerId, eventName, error))
  }

  broker(id: string, abort?: AbortSignal | AbortController) {
    const abortController = !abort
      ? new AbortController()
      : abort instanceof AbortController
      ? abort
      : fromSignal(abort)

    return new Broker<Events, EventGens, Invokables>(this, id, abortController)
  }

  async start() {
    this.#started = true
    return Promise.all(this.#queued.map((handle) => handle()))
  }

  emit<EventName extends keyof Events>(
    broker: Broker<Events, EventGens, Invokables>,
    eventName: EventName,
    args: Events[EventName],
    abortSignal?: AbortSignal
  ): void | Promise<void> {
    const handle = () => {
      let result: void | Promise<void>

      try {
        const interception = this.#callEventInterceptors(eventName, args)
        result = interception
          ? interception.then((moddedArgs) => {
              if (moddedArgs !== CancelEvent) {
                this.#callSubscribers(eventName, moddedArgs, abortSignal)
              }
            })
          : this.#callSubscribers(eventName, args, abortSignal)
      } catch (error: any) {
        this.#reportError(broker.id, eventName, error)
      }

      return result instanceof Promise
        ? result.catch((error) =>
            this.#reportError(broker.id, eventName, error)
          )
        : result
    }

    return this.#started
      ? handle()
      : this.#queue(broker, handle).catch((error) =>
          this.#reportError(broker.id, eventName, error)
        )
  }

  interceptEvent<EventName extends keyof Events>(
    broker: Broker<Events, EventGens, Invokables>,
    eventName: EventName,
    args: EventInterceptorArgs<Events[EventName]>
  ): Unsubscriber {
    const interceptor = {
      broker,
      args: init(args),
      fn: last(args),
    } as any

    this.#eventInterceptors = amend(
      this.#eventInterceptors,
      eventName,
      (interceptors = []) => [...interceptors!, interceptor]
    )

    return () => {
      this.#eventInterceptors[eventName] = removeItem(
        interceptor,
        this.#eventInterceptors[eventName]!
      )
    }
  }

  interceptInvoker<InvokableName extends keyof Invokables>(
    broker: Broker<Events, EventGens, Invokables>,
    invokableName: InvokableName,
    args: InvokerInterceptorArgs<
      Invokables[InvokableName]['args'],
      Invokables[InvokableName]['return']
    >
  ): Unsubscriber {
    const interceptor = {
      broker,
      args: init(args),
      fn: last(args),
    } as any

    this.#invokerInterceptors = amend(
      this.#invokerInterceptors,
      invokableName,
      (interceptors = []) => [...interceptors!, interceptor]
    )

    return () => {
      this.#invokerInterceptors[invokableName] = removeItem(
        interceptor,
        this.#invokerInterceptors[invokableName]!
      )
    }
  }

  on<EventName extends keyof Events>(
    broker: Broker<Events, EventGens, Invokables>,
    eventName: EventName,
    args: SubscriberArgs<Events[EventName]>
  ): Unsubscriber {
    if (broker.aborted) return () => {}

    const subscriber = {
      broker,
      args: init(args),
      fn: last(args),
    } as any

    this.#subscribers = amend(
      this.#subscribers,
      eventName,
      (subscribers = []) => [...subscribers!, subscriber]
    )

    const cancel = () => {
      this.#subscribers[eventName] = removeItem(
        subscriber,
        this.#subscribers[eventName]!
      )
    }

    broker.onAbort(cancel)

    return cancel
  }

  once<EventName extends keyof Events>(
    broker: Broker<Events, EventGens, Invokables>,
    eventName: EventName,
    args: SubscriberArgs<Events[EventName]>
  ): Unsubscriber {
    const fn = last(args) as SubscriberFn<Events[EventName]>
    const onceFn: SubscriberFn<Events[EventName]> = (...args) => {
      cancel()
      return fn(...args)
    }
    const cancel = this.on(
      broker,
      eventName,
      replaceLastItem(args, onceFn) as SubscriberArgs<Events[EventName]>
    )
    return cancel
  }

  async until<
    EventName extends keyof Events,
    Args extends UntilArgs<Events[EventName]>
  >(
    broker: Broker<Events, EventGens, Invokables>,
    eventName: EventName,
    args: Args,
    abortSignal?: AbortSignal
  ): Promise<UntilRtn<Events[EventName], Args>> {
    return new Promise<UntilRtn<Events[EventName], Args>>((resolve, reject) => {
      const abortSignalComposite = AbortSignalComposite.create(
        abortSignal,
        broker.abortSignal
      )

      if (abortSignalComposite.aborted) return reject(new AbortError())

      const subscriberArgs = [
        ...args,
        (...args: any) => resolve(args),
      ] as SubscriberArgs<Events[EventName]>

      this.once(broker, eventName, subscriberArgs)

      abortSignalComposite.onAbort(() => {
        reject(new AbortError())
      })
    })
  }

  hasSubscriber(eventName: keyof Events) {
    return !!this.#subscribers[eventName]?.length
  }

  generator<EventName extends keyof EventGens>(
    broker: Broker<Events, EventGens, Invokables>,
    eventName: EventName,
    args: EventGeneratorArgs<
      EventGens[EventName]['args'],
      EventGens[EventName]['yield']
    >
  ): Unsubscriber {
    if (broker.aborted) return () => {}

    const iterator = {
      broker,
      args: init(args),
      fn: last(args),
    } as any

    this.#eventGenerators = amend(
      this.#eventGenerators,
      eventName,
      (iterators = []) => [...iterators!, iterator]
    )

    const cancel = () => {
      this.#eventGenerators[eventName] = removeItem(
        iterator,
        this.#eventGenerators[eventName]!
      )
    }

    broker.onAbort(cancel)

    return cancel
  }

  async *iterate<EventName extends keyof EventGens>(
    broker: Broker<Events, EventGens, Invokables>,
    eventName: EventName,
    args: EventGens[EventName]['args'],
    abortSignal?: AbortSignal
  ): AsyncIterable<EventGens[EventName]['yield']> {
    if (!this.#started) await this.#queue(broker, () => {})

    yield* combineIterators(
      ...(this.#eventGenerators[eventName] || [])!
        .filter((iterator) => this.#argumentIndex(iterator.args, args) !== -1)
        .map((iterator) => {
          const abortSignalComposite = AbortSignalComposite.create(
            abortSignal,
            iterator.broker.abortSignal
          )

          return iterator.fn(
            ...args.slice(this.#argumentIndex(iterator.args, args)),
            abortSignalComposite
          )
        })
    )
  }

  iterateWithin<EventName extends keyof EventGens>(
    broker: Broker<Events, EventGens, Invokables>,
    within: number,
    eventName: EventName,
    args: EventGens[EventName]['args'],
    abortSignal?: AbortSignal
  ): AsyncIterable<EventGens[EventName]['yield']> {
    return iteratorRace(
      this.iterate(broker, eventName, args, abortSignal),
      within,
      AbortSignalComposite.create(abortSignal, broker.abortSignal)
    )
  }

  async accumulate<EventName extends keyof EventGens>(
    broker: Broker<Events, EventGens, Invokables>,
    eventName: EventName,
    args: EventGens[EventName]['args'],
    abortSignal?: AbortSignal
  ) {
    return accumulate(this.iterate(broker, eventName, args, abortSignal))
  }

  async accumulateWithin<EventName extends keyof EventGens>(
    broker: Broker<Events, EventGens, Invokables>,
    within: number,
    eventName: EventName,
    args: EventGens[EventName]['args'],
    abortSignal?: AbortSignal
  ) {
    return accumulate(
      this.iterateWithin(broker, within, eventName, args, abortSignal)
    )
  }

  register<InvokableName extends keyof Invokables>(
    broker: Broker<Events, EventGens, Invokables>,
    invokableName: InvokableName,
    allArgs: InvokerRegistrationArgs<
      Invokables[InvokableName]['args'],
      Invokables[InvokableName]['return']
    >
  ): Unsubscriber {
    if (broker.aborted) return () => {}

    const args = init(allArgs) as Invokables[InvokableName]['args']
    const fn = last(allArgs) as InvokerFn<
      Invokables[InvokableName]['args'],
      Invokables[InvokableName]['return']
    >
    const invokers = this.#invokers[invokableName] || []
    const registeredInvoker = invokers.find(
      (invoker) => this.#argumentIndex(invoker.args, args) !== -1
    )

    if (registeredInvoker)
      throw new Error(
        `An invoker has already been registered that matches ${invokableName.toString()} with args: ${args.join(
          ', '
        )}.`
      )

    const subscriber = {
      broker,
      args,
      fn,
    }

    this.#invokers[invokableName] = [
      ...invokers,
      subscriber,
    ] as unknown as Invokers<Invokables>[InvokableName]

    const cancel = () => {
      this.#invokers[invokableName] = removeItem(
        subscriber,
        this.#invokers[invokableName] as any
      ) as unknown as Invokers<Invokables>[InvokableName]
    }

    broker.onAbort(() => setTimeout(cancel, 0))

    return cancel
  }

  async invoke<InvokableName extends keyof Invokables>(
    broker: Broker<Events, EventGens, Invokables>,
    invokableName: InvokableName,
    args: Invokables[InvokableName]['args'],
    abortSignal?: AbortSignal
  ): Promise<Invokables[InvokableName]['return']> {
    const handle = async () =>
      new Promise((resolve, reject) => {
        const abortSignalComposite = AbortSignalComposite.create(
          abortSignal,
          broker.abortSignal
        )
        if (abortSignalComposite.aborted) return reject(new AbortError())
        abortSignalComposite.onAbort(() => reject(new AbortError()))

        resolve(this.#invokeChain(invokableName, args, abortSignalComposite))
      })

    return this.#started ? handle() : this.#queue(broker, handle)
  }

  #callEventInterceptors<EventName extends keyof Events>(
    eventName: EventName,
    args: Events[EventName]
  ): void | Promise<Events[EventName] | typeof CancelEvent> {
    const eventInterceptors = (this.#eventInterceptors[eventName] || [])!

    if (!eventInterceptors.length) return

    return (async () => {
      let moddedArgs: Events[EventName] | typeof CancelEvent = args

      for (const interceptor of eventInterceptors) {
        const index = this.#argumentIndex(interceptor.args, moddedArgs)

        if (index === -1) continue

        const newArgs = await interceptor.fn(...moddedArgs.slice(index))

        if (newArgs === CancelEvent) return CancelEvent
        else if (newArgs)
          moddedArgs = [
            ...moddedArgs.slice(0, index),
            ...newArgs,
          ] as Events[EventName]
      }

      return moddedArgs
    })()
  }

  async #invokeChain<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    args: Invokables[InvokableName]['args'],
    signal: AbortSignal
  ): Promise<Invokables[InvokableName]['return']> {
    const invokerInterceptors = this.#invokerInterceptors[invokableName] || []

    const invokeChain = async (
      index: number,
      args: Invokables[InvokableName]['args']
    ): Promise<Invokables[InvokableName]['return']> => {
      const interceptor = invokerInterceptors[index]
      if (!interceptor) return this.#invoke(invokableName, args, signal)
      const argIndex = this.#argumentIndex(interceptor.args, args)
      return argIndex === -1
        ? invokeChain(index + 1, args)
        : interceptor.fn(
            (...nextArgs) => invokeChain(index + 1, nextArgs),
            ...args.slice(argIndex)
          )
    }

    return invokeChain(0, args)
  }

  #callSubscribers<EventName extends keyof Events>(
    eventName: EventName,
    args: Events[EventName],
    abortSignal?: AbortSignal
  ): void | Promise<void> {
    const subscribers = (this.#subscribers[eventName] || [])!
    const promises: Promise<void>[] = []

    for (const subscriber of subscribers) {
      const index = this.#argumentIndex(subscriber.args, args)

      const subscriberAbortSignal = AbortSignalComposite.create(
        abortSignal,
        subscriber.broker.abortSignal
      )

      if (index >= 0) {
        const promise = subscriber.fn(
          ...args.slice(index),
          subscriberAbortSignal
        )
        if (promise) {
          promises.push(promise)
        }
      }
    }

    if (promises.length) {
      return Promise.all(promises).then(() => {})
    }
  }

  async #invoke<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    args: Invokables[InvokableName]['args'],
    abortSignal: AbortSignal
  ): Promise<Invokables[InvokableName]['return']> {
    const invokers = this.#invokers[invokableName]
    const invoker =
      invokers &&
      invokers.find((invoker) => this.#argumentIndex(invoker.args, args) !== -1)

    if (!invoker) {
      throw new InvokableNotRegisteredError(this, invokableName.toString())
    }

    return invoker.fn(
      ...(args.slice(
        this.#argumentIndex(invoker.args, args)
      ) as Invokables[InvokableName]['args']),
      abortSignal
    )
  }

  #argumentIndex(args1: ArrayLike<unknown>, args2: ArrayLike<unknown>) {
    if (!args1.length) return 0
    else if (args1.length > args2.length) return -1

    let i = 0
    for (; i < args1.length; i++) if (args1[i] !== args2[i]) return -1
    return i
  }

  async #queue<T>(
    broker: Broker<Events, EventGens, Invokables>,
    handler: () => T
  ) {
    return new Promise<UnpackResolvableValue<T>>((resolve, reject) => {
      if (broker.aborted) return reject(new AbortError())

      const fn = () => resolve(handler() as UnpackResolvableValue<T>)
      this.#queued.push(fn)

      broker.onAbort(() => {
        this.#queued = removeItem(fn, this.#queued)
        reject(new AbortError())
      })
    })
  }
}
