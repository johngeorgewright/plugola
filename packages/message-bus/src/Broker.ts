import { last, replaceLastItem } from './array'
import type MessageBus from './MessageBus'
import type {
  EventsT,
  InterceptorArgs,
  SubscriberArgs,
  SubscriberFn,
  UntilArgs,
  UntilRtn,
} from './types'

export default class Broker<Events extends EventsT> {
  constructor(
    private readonly messageBus: MessageBus<Events>,
    public readonly id: string
  ) {}

  emit<EventName extends keyof Events>(
    eventName: EventName,
    ...args: Events[EventName]
  ): void | Promise<void> {
    return this.messageBus.emit(this, eventName, args)
  }

  intercept<EventName extends keyof Events>(
    eventName: EventName,
    ...args: InterceptorArgs<Events[EventName]>
  ) {
    return this.messageBus.intercept(this, eventName, args)
  }

  on<EventName extends keyof Events>(
    eventName: EventName,
    ...args: SubscriberArgs<Events[EventName]>
  ) {
    return this.messageBus.on(this, eventName, args)
  }

  once<EventName extends keyof Events>(
    eventName: EventName,
    ...args: SubscriberArgs<Events[EventName]>
  ) {
    const fn = last(args) as unknown as SubscriberFn<Events[EventName]>
    const onceFn = ((...args: Events[EventName]) => {
      off()
      return fn(...args)
    }) as SubscriberFn<Events[EventName]>
    const off = this.messageBus.on(
      this,
      eventName,
      // @ts-ignore
      replaceLastItem(args, onceFn)
    )
    return off
  }

  /**
   * @todo Cannot correctly infer `Args` and therefore `UntilRtn` is always all args
   */
  async until<
    EventName extends keyof Events,
    Args extends UntilArgs<Events[EventName]>
  >(eventName: EventName, ...args: Args): Promise<unknown[]> {
    return new Promise<UntilRtn<Events[EventName], Args>>((resolve) => {
      const subscriberArgs = [
        ...args,
        (...args: any) => resolve(args),
      ] as unknown as SubscriberArgs<Events[EventName]>
      this.once(eventName, ...subscriberArgs)
    })
  }
}
