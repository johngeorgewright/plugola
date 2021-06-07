import { combineIterators, iteratorRace } from '@johngw/async-iterator'
import { init, last, removeItem, replaceLastItem } from './array'
import Broker from './Broker'
import { amend } from './object'
import { CancelEvent } from './symbols'
import type {
  EventsT,
  EventInterceptorArgs,
  EventInterceptorFn,
  EventInterceptors,
  InvokablesT,
  Invokers,
  SubscriberArgs,
  Subscribers,
  InvokerInterceptors,
  UnpackResolvableValue,
  SubscriberFn,
  UntilRtn,
  UntilArgs,
  EventGeneratorsT,
  EventGenerators,
  EventGeneratorArgs,
  InvokerRegistrationArgs,
} from './types'

export default class MessageBus<
  Events extends EventsT = EventsT,
  EventGens extends EventGeneratorsT = EventGeneratorsT,
  Invokables extends InvokablesT = InvokablesT
> {
  #eventInterceptors: EventInterceptors<Events> = {}
  #eventGenerators: EventGenerators<EventGens> = {}
  #invokers: Invokers<Invokables> = {}
  #invokerInterceptors: InvokerInterceptors<Invokables> = {}
  #queued: Array<() => unknown> = []
  #started: boolean = false
  #subscribers: Subscribers<Events> = {}

  broker(id: string) {
    return new Broker<Events, EventGens, Invokables>(this, id)
  }

  async start() {
    this.#started = true
    return Promise.all(this.#queued.map((handle) => handle()))
  }

  emit<EventName extends keyof Events>(
    _broker: Broker<Events, EventGeneratorsT, InvokablesT>,
    eventName: EventName,
    args: Events[EventName]
  ) {
    const handle = () => {
      const interception = this.#callEventInterceptors(eventName, args)
      return interception
        ? interception.then((moddedArgs) => {
            if (moddedArgs !== CancelEvent) {
              this.#callSubscribers(eventName, moddedArgs)
            }
          })
        : this.#callSubscribers(eventName, args)
    }
    return this.#started ? handle() : this.#queue(handle)
  }

  interceptEvent<EventName extends keyof Events>(
    broker: Broker<Events, EventGeneratorsT, InvokablesT>,
    eventName: EventName,
    args: EventInterceptorArgs<Events[EventName]>
  ) {
    const interceptor = {
      broker,
      args: init(args),
      fn: last(args) as EventInterceptorFn<unknown[], unknown[]>,
    }

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
    broker: Broker<EventsT, EventGeneratorsT, Invokables>,
    invokableName: InvokableName,
    args: Invokables[InvokableName]['args']
  ) {
    const interceptor = {
      broker,
      args: init(args),
      fn: last(args as any) as any,
    }

    this.#invokerInterceptors = amend(
      this.#invokerInterceptors,
      invokableName,
      (interceptors = []) => [...interceptors!, interceptor]
    )

    return () => {
      this.#invokerInterceptors[invokableName] = removeItem(
        interceptor,
        this.#invokerInterceptors[invokableName] as any
      )
    }
  }

  on<EventName extends keyof Events>(
    broker: Broker<Events, EventGeneratorsT, InvokablesT>,
    eventName: EventName,
    args: SubscriberArgs<Events[EventName]>
  ) {
    const subscriber = {
      broker,
      args: init(args),
      fn: last(args) as (...args: unknown[]) => any,
    }

    this.#subscribers = amend(
      this.#subscribers,
      eventName,
      (subscribers = []) => [...subscribers!, subscriber]
    )

    return () => {
      this.#subscribers[eventName] = removeItem(
        subscriber,
        this.#subscribers[eventName] as any
      )
    }
  }

  once<EventName extends keyof Events>(
    broker: Broker<Events, EventGeneratorsT, InvokablesT>,
    eventName: EventName,
    args: SubscriberArgs<Events[EventName]>
  ): () => void {
    const fn = last(args) as unknown as SubscriberFn<Events[EventName]>
    const onceFn = ((...args: Events[EventName]) => {
      off()
      return fn(...args)
    }) as SubscriberFn<Events[EventName]>
    const off = this.on(
      broker,
      eventName,
      replaceLastItem(args, onceFn) as SubscriberArgs<Events[EventName]>
    )
    return off
  }

  async until<
    EventName extends keyof Events,
    Args extends UntilArgs<Events[EventName]>
  >(
    broker: Broker<Events, EventGeneratorsT, InvokablesT>,
    eventName: EventName,
    args: Args
  ) {
    return new Promise<UntilRtn<Events[EventName], Args>>((resolve) => {
      const subscriberArgs = [
        ...args,
        (...args: any) => resolve(args),
      ] as unknown as SubscriberArgs<Events[EventName]>
      this.once(broker, eventName, subscriberArgs)
    })
  }

  hasSubscriber(eventName: keyof Events) {
    return !!this.#subscribers[eventName]?.length
  }

  generator<EventName extends keyof EventGens>(
    broker: Broker<EventsT, EventGens, InvokablesT>,
    eventName: EventName,
    args: EventGeneratorArgs<
      EventGens[EventName]['args'],
      EventGens[EventName]['yield']
    >
  ) {
    const iterator = {
      broker,
      args: init(args),
      fn: last(args) as any,
    }

    // @ts-ignore
    this.#eventGenerators = amend(
      this.#eventGenerators,
      eventName,
      (iterators = []) => [...iterators!, iterator]
    )

    return () => {
      this.#eventGenerators[eventName] = removeItem(
        iterator,
        this.#eventGenerators[eventName] as any
      )
    }
  }

  async *iterate<EventName extends keyof EventGens>(
    _broker: Broker<EventsT, EventGens, Invokables>,
    eventName: EventName,
    args: EventGens[EventName]['args']
  ): AsyncIterable<EventGens[EventName]['yield']> {
    if (!this.#started) {
      await this.#queue(() => {})
    }

    yield* combineIterators(
      ...(this.#eventGenerators[eventName] || [])!
        .filter((iterator) => this.#argumentIndex(iterator.args, args) !== -1)
        .map((iterator) =>
          iterator.fn(...args.slice(this.#argumentIndex(iterator.args, args)))
        )
    )
  }

  iterateWithin<EventName extends keyof EventGens>(
    broker: Broker<EventsT, EventGens, Invokables>,
    within: number,
    eventName: EventName,
    args: EventGens[EventName]['args']
  ) {
    return iteratorRace(this.iterate(broker, eventName, args), within)
  }

  register<InvokableName extends keyof Invokables>(
    broker: Broker<Events, EventGens, Invokables>,
    invokableName: InvokableName,
    allArgs: InvokerRegistrationArgs<
      Invokables[InvokableName]['args'],
      Invokables[InvokableName]['return']
    >
  ) {
    const args = init(allArgs)
    const fn = last(allArgs) as any
    const invokers = this.#invokers[invokableName]
    const registeredInvoker =
      invokers &&
      invokers.find((invoker) => this.#argumentIndex(invoker.args, args) !== -1)

    if (registeredInvoker) {
      throw new Error(
        `An invoker has already been registered that matches ${invokableName} with args: ${args.join(
          ', '
        )}.`
      )
    }

    this.#invokers[invokableName] = [
      ...(invokers || [])!,
      {
        broker,
        args,
        fn,
      },
    ]

    return () => {
      delete this.#invokers[invokableName]
    }
  }

  async invoke<InvokableName extends keyof Invokables>(
    _broker: Broker<Events, EventGens, Invokables>,
    invokableName: InvokableName,
    args: Invokables[InvokableName]['args']
  ): Promise<Invokables[InvokableName]['return']> {
    const handle = async () =>
      this.#callInvoker(
        invokableName,
        await this.#callInvokerInterceptors(invokableName, args)
      )
    return this.#started ? handle() : this.#queue(handle)
  }

  #callEventInterceptors<EventName extends keyof Events>(
    eventName: EventName,
    args: Events[EventName]
  ): void | Promise<Events[EventName] | typeof CancelEvent> {
    const eventInterceptors = (this.#eventInterceptors[eventName] || [])!

    if (!eventInterceptors.length) {
      return
    }

    return (async () => {
      let moddedArgs: Events[EventName] | typeof CancelEvent = args

      for (const interceptor of eventInterceptors) {
        const index = this.#argumentIndex(interceptor.args, moddedArgs)

        if (index === -1) {
          continue
        }

        const newArgs = await interceptor.fn(...moddedArgs.slice(index))

        if (newArgs === CancelEvent) {
          return CancelEvent
        } else if (newArgs) {
          moddedArgs = [
            ...moddedArgs.slice(0, index),
            ...newArgs,
          ] as Events[EventName]
        }
      }

      return moddedArgs
    })()
  }

  async #callInvokerInterceptors<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    args: Invokables[InvokableName]['args']
  ) {
    const invokerInterceptors = (this.#invokerInterceptors[invokableName] ||
      [])!

    if (!invokerInterceptors.length) {
      return args
    }

    return invokerInterceptors.reduce<
      Promise<Invokables[InvokableName]['args']>
    >(async (acc, interceptor) => {
      const args = await acc
      const index = this.#argumentIndex(interceptor.args, args)

      if (index === -1) {
        return args
      }

      const newArgs = await Promise.resolve(
        interceptor.fn(...args.slice(index))
      )

      return newArgs
        ? ([
            ...args.slice(0, index),
            ...newArgs,
          ] as Invokables[InvokableName]['args'])
        : args
    }, Promise.resolve(args))
  }

  #callSubscribers<EventName extends keyof Events>(
    eventName: EventName,
    args: Events[EventName]
  ): void | Promise<void> {
    const subscribers = (this.#subscribers[eventName] || [])!
    const promises: Promise<void>[] = []

    for (const subscriber of subscribers) {
      const index = this.#argumentIndex(subscriber.args, args)
      if (index >= 0) {
        const promise = subscriber.fn(...args.slice(index))
        if (promise) {
          promises.push(promise)
        }
      }
    }

    if (promises.length) {
      return Promise.all(promises).then(() => {})
    }
  }

  async #callInvoker<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    args: Invokables[InvokableName]['args']
  ): Promise<Invokables[InvokableName]['return']> {
    const invokers = this.#invokers[invokableName]
    const invoker =
      invokers &&
      invokers.find((invoker) => this.#argumentIndex(invoker.args, args) !== -1)

    if (!invoker) {
      throw new Error(`Cannot find matching invoker for ${invokableName}.`)
    }

    return invoker.fn(...args.slice(this.#argumentIndex(invoker.args, args)))
  }

  #argumentIndex(args1: ArrayLike<unknown>, args2: ArrayLike<unknown>) {
    if (!args1.length) {
      return 0
    } else if (args1.length > args2.length) {
      return -1
    }

    let i: number

    for (i = 0; i < args1.length; i++) {
      if (args1[i] !== args2[i]) {
        return -1
      }
    }

    return i + 1
  }

  async #queue<T>(handler: () => T) {
    return new Promise<T>((resolve) => {
      this.#queued.push(() => resolve(handler()))
    }) as Promise<UnpackResolvableValue<T>>
  }
}
