import { init, last, removeItem } from './array'
import Broker from './Broker'
import { CancelEvent } from './symbols'
import type {
  EventsT,
  EventInterceptorArgs,
  EventInterceptorFn,
  EventInterceptors,
  InvokablesT,
  InvokerArgs,
  Invokers,
  SubscriberArgs,
  Subscribers,
  InvokerInterceptors,
  InvokerInterceptorArgs,
  UnpackResolvableValue,
} from './types'

export default class MessageBus<
  Events extends EventsT,
  Invokables extends InvokablesT
> {
  private eventInterceptors: EventInterceptors<Events> = {}
  private invokers: Invokers<Invokables> = {}
  private invokerInterceptors: InvokerInterceptors<Invokables> = {}
  private queued: Array<() => unknown> = []
  private started: boolean = false
  private subscribers: Subscribers<Events> = {}

  broker(id: string) {
    return new Broker<Events, Invokables>(this, id)
  }

  async start() {
    this.started = true
    return Promise.all(this.queued.map((handle) => handle()))
  }

  emit<EventName extends keyof Events>(
    _broker: Broker<Events, InvokablesT>,
    eventName: EventName,
    args: Events[EventName]
  ) {
    const handle = () => {
      const interception = this.callEventInterceptors(eventName, args)
      return interception
        ? interception.then((moddedArgs) => {
            if (moddedArgs !== CancelEvent) {
              this.callSubscribers(eventName, moddedArgs)
            }
          })
        : this.callSubscribers(eventName, args)
    }
    return this.started ? handle() : this.queue(handle)
  }

  interceptEvent<EventName extends keyof Events>(
    broker: Broker<Events, InvokablesT>,
    eventName: EventName,
    args: EventInterceptorArgs<Events[EventName]>
  ) {
    const interceptor = {
      broker,
      args: init(args),
      fn: last(args) as EventInterceptorFn<unknown[], unknown[]>,
    }

    if (!this.eventInterceptors[eventName]) {
      this.eventInterceptors[eventName] = []
    }

    const eventInterceptors = this.eventInterceptors[eventName]!

    // @ts-ignore
    eventInterceptors.push(interceptor)

    return () => {
      this.eventInterceptors[eventName] = removeItem(
        interceptor,
        this.eventInterceptors[eventName]!
      )
    }
  }

  interceptInvoker<InvokableName extends keyof Invokables>(
    broker: Broker<Events, Invokables>,
    invokableName: InvokableName,
    args: InvokerInterceptorArgs<
      Invokables[InvokableName]['args'],
      Invokables[InvokableName]['return']
    >
  ) {
    const interceptor = {
      broker,
      args: init(args),
      fn: last(args) as any,
    }

    if (!this.invokerInterceptors[invokableName]) {
      this.invokerInterceptors[invokableName] = []
    }

    const invokerInterceptors = this.invokerInterceptors[invokableName]!

    // @ts-ignore
    invokerInterceptors.push(interceptor)

    return () => {
      this.invokerInterceptors[invokableName] = removeItem(
        interceptor,
        this.invokerInterceptors[invokableName] as any
      )
    }
  }

  on<EventName extends keyof Events>(
    broker: Broker<Events, InvokablesT>,
    eventName: EventName,
    args: SubscriberArgs<Events[EventName]>
  ) {
    if (!this.subscribers[eventName]) {
      this.subscribers[eventName] = []
    }

    const subscriber = {
      broker,
      args: init(args),
      fn: last(args) as (...args: unknown[]) => any,
    }

    this.subscribers[eventName]!.push(subscriber)

    return () => {
      this.subscribers[eventName] = removeItem(
        subscriber,
        this.subscribers[eventName] as any
      )
    }
  }

  hasSubscriber(eventName: keyof Events) {
    return !!this.subscribers[eventName]?.length
  }

  register<InvokableName extends keyof Invokables>(
    broker: Broker<Events, Invokables>,
    invokableName: InvokableName,
    args: InvokerArgs<
      Invokables[InvokableName]['args'],
      Invokables[InvokableName]['return']
    >
  ) {
    if (!this.invokers[invokableName]) {
      this.invokers[invokableName] = []
    }

    const invoker = {
      broker,
      args: init(args),
      fn: last(args) as (...args: unknown[]) => any,
    }

    this.invokers[invokableName]!.push(invoker)

    return () => {
      this.invokers[invokableName] = removeItem(
        invoker,
        this.invokers[invokableName] as any
      )
    }
  }

  invoke<InvokableName extends keyof Invokables>(
    _broker: Broker<Events, Invokables>,
    invokableName: InvokableName,
    args: Invokables[InvokableName]['args']
  ) {
    if (!this.started) {
      throw new Error(
        `Trying to invoke ${invokableName} before the message bus has bee started`
      )
    }

    const interception = this.callInvokerInterceptors(invokableName, args)

    return interception instanceof Promise
      ? interception.then((moddedArgs) =>
          this.callInvokers(invokableName, moddedArgs)
        )
      : this.callInvokers(invokableName, interception as any)
  }

  private callEventInterceptors<EventName extends keyof Events>(
    eventName: EventName,
    args: Events[EventName]
  ): void | Promise<Events[EventName] | typeof CancelEvent> {
    const eventInterceptors = (this.eventInterceptors[eventName] || [])!

    if (!eventInterceptors.length) {
      return
    }

    return (async () => {
      let moddedArgs: Events[EventName] | typeof CancelEvent = args

      for (const interceptor of eventInterceptors) {
        const index = this.argumentIndex(interceptor.args, moddedArgs)

        if (index === -1) {
          continue
        }

        const newArgs = await interceptor.fn(moddedArgs.slice(index))

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

  private callInvokerInterceptors<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    args: Invokables[InvokableName]['args']
  ): Invokables[InvokableName]['return'] extends Promise<unknown>
    ?
        | Invokables[InvokableName]['args']
        | Promise<Invokables[InvokableName]['args']>
    : Invokables[InvokableName]['args'] {
    const invokerInterceptors = (this.invokerInterceptors[invokableName] || [])!

    if (!invokerInterceptors.length) {
      return args as any
    }

    let moddedArgs: Invokables[InvokableName]['args'] = args

    let promiseChain: Promise<Invokables[InvokableName]['args']> | undefined

    for (const interceptor of invokerInterceptors) {
      const index = this.argumentIndex(interceptor.args, moddedArgs)

      if (index === -1) {
        continue
      }

      if (promiseChain) {
        promiseChain = promiseChain.then((moddedArgs) => {
          const newArgs = interceptor.fn(moddedArgs.slice(index))
          return newArgs
            ? (moddedArgs = [
                ...moddedArgs.slice(0, index),
                ...newArgs,
              ] as Invokables[InvokableName]['args'])
            : moddedArgs
        })
      } else {
        const newArgs = interceptor.fn(moddedArgs.slice(index))
        if (newArgs instanceof Promise) {
          promiseChain = newArgs
        } else if (newArgs) {
          moddedArgs = [
            ...moddedArgs.slice(0, index),
            ...newArgs,
          ] as Invokables[InvokableName]['args']
        }
      }
    }

    return promiseChain || (moddedArgs as any)
  }

  private callSubscribers<EventName extends keyof Events>(
    eventName: EventName,
    args: Events[EventName]
  ): void | Promise<void> {
    const subscribers = (this.subscribers[eventName] || [])!
    const promises: Promise<void>[] = []

    for (const subscriber of subscribers) {
      const index = this.argumentIndex(subscriber.args, args)
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

  private callInvokers<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    args: Invokables[InvokableName]['args']
  ) {
    const invokers = (this.invokers[invokableName] || [])!
    const results: Invokables[InvokableName]['return'][] = []

    for (const invoker of invokers) {
      const index = this.argumentIndex(invoker.args, args)
      if (index >= 0) {
        results.push(invoker.fn(...args.slice(index)))
      }
    }

    return results
  }

  private argumentIndex(args1: ArrayLike<unknown>, args2: ArrayLike<unknown>) {
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

  private async queue<T>(handler: () => T) {
    return new Promise<T>((resolve) => {
      this.queued.push(() => resolve(handler()))
    }) as Promise<UnpackResolvableValue<T>>
  }
}
