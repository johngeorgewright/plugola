import { init, last, removeItem } from './array'
import Broker from './Broker'
import { CancelEvent } from './symbols'
import type {
  EventsT,
  InterceptorArgs,
  InterceptorFn,
  Interceptors,
  SubscriberArgs,
  Subscribers,
} from './types'

export default class MessageBus<Events extends EventsT> {
  private interceptors: Interceptors<Events> = {}
  private queued: Array<() => unknown> = []
  private started: boolean = false
  private subscribers: Subscribers<Events> = {}

  broker(id: string) {
    return new Broker<Events>(this, id)
  }

  async emit<EventName extends keyof Events>(
    _broker: Broker<Events>,
    eventName: EventName,
    args: Events[EventName]
  ): Promise<void> {
    const handle = async () => {
      const moddedArgs = await this.callInterceptors(eventName, args)
      if (moddedArgs !== CancelEvent) {
        this.callSubscribers(eventName, moddedArgs)
      }
    }
    return this.started ? handle() : this.queue(handle)
  }

  intercept<EventName extends keyof Events>(
    broker: Broker<Events>,
    eventName: EventName,
    args: InterceptorArgs<Events[EventName]>
  ) {
    const interceptor = {
      broker,
      args: init(args),
      fn: last(args) as InterceptorFn<unknown[], unknown[]>,
    }

    if (!this.interceptors[eventName]) {
      this.interceptors[eventName] = []
    }

    const interceptors = this.interceptors[eventName]!

    // @ts-ignore
    interceptors.push(interceptor)

    return () => {
      this.interceptors[eventName] = removeItem(
        interceptor,
        this.interceptors[eventName]!
      )
    }
  }

  on<EventName extends keyof Events>(
    broker: Broker<Events>,
    eventName: EventName,
    args: SubscriberArgs<Events[EventName]>
  ) {
    if (!this.subscribers[eventName]) {
      this.subscribers[eventName] = []
    }

    const subscriber = {
      broker,
      args: init(args),
      cancel: () => {
        this.subscribers[eventName] = removeItem(
          subscriber,
          this.subscribers[eventName]!
        )
      },
      fn: last(args) as (...args: unknown[]) => any,
    }

    this.subscribers[eventName]!.push(subscriber)

    return subscriber
  }

  private async callInterceptors<EventName extends keyof Events>(
    eventName: EventName,
    args: Events[EventName]
  ) {
    let moddedArgs = args
    const interceptors = (this.interceptors[eventName] || [])!

    for (const interceptor of interceptors) {
      const index = this.argumentIndex(interceptor.args, moddedArgs)

      if (index === -1) {
        continue
      }

      const newArgs = await interceptor.fn(args.slice(index))

      if (newArgs === CancelEvent) {
        return CancelEvent
      } else if (newArgs) {
        moddedArgs = [...args.slice(0, index), ...newArgs] as Events[EventName]
      }
    }

    return moddedArgs
  }

  private async callSubscribers<EventName extends keyof Events>(
    eventName: EventName,
    args: Events[EventName]
  ) {
    const subscribers = (this.subscribers[eventName] || [])!

    for (const subscriber of subscribers) {
      const index = this.argumentIndex(subscriber.args, args)
      if (index >= 0) {
        subscriber.fn(...args.slice(index))
      }
    }
  }

  private argumentIndex(args1: ArrayLike<unknown>, args2: ArrayLike<unknown>) {
    if (args1.length > args2.length) {
      return -1
    }

    let i: number

    for (i = 0; i < args1.length - 1; i++) {
      if (args1[i] !== args2[i]) {
        return -1
      }
    }

    return i
  }

  private async queue<T>(handler: () => Promise<T>) {
    return new Promise<T>((resolve) => {
      this.queued.push(() => resolve(handler()))
    })
  }
}
