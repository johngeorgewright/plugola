import { last, replaceLastItem } from './array'
import type MessageBus from './MessageBus'
import type {
  EventsT,
  EventInterceptorArgs,
  InvokablesT,
  SubscriberArgs,
  SubscriberFn,
  UntilArgs,
  UntilRtn,
  InvokerArgs,
  InvokerInterceptorArgs,
} from './types'

export default class Broker<
  Events extends EventsT,
  Invokables extends InvokablesT
> {
  constructor(
    private readonly messageBus: MessageBus<Events, Invokables>,
    public readonly id: string
  ) {}

  emit<EventName extends keyof Events>(
    eventName: EventName,
    ...args: Events[EventName]
  ): void | Promise<void> {
    return this.messageBus.emit(this, eventName, args)
  }

  interceptEvent<EventName extends keyof Events>(
    eventName: EventName,
    ...args: EventInterceptorArgs<Events[EventName]>
  ): () => void {
    return this.messageBus.interceptEvent(this, eventName, args)
  }

  on<EventName extends keyof Events>(
    eventName: EventName,
    ...args: SubscriberArgs<Events[EventName]>
  ): () => void {
    return this.messageBus.on(this, eventName, args)
  }

  once<EventName extends keyof Events>(
    eventName: EventName,
    ...args: SubscriberArgs<Events[EventName]>
  ): () => void {
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

  register<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    ...args: InvokerArgs<
      Invokables[InvokableName]['args'],
      Invokables[InvokableName]['return']
    >
  ): () => void {
    return this.messageBus.register(this, invokableName, args)
  }

  invoke<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    ...args: Invokables[InvokableName]['args']
  ): Invokables[InvokableName]['return'] extends Promise<unknown>
    ?
        | Invokables[InvokableName]['return'][]
        | Promise<Invokables[InvokableName]['return'][]>
    : Invokables[InvokableName]['return'][] {
    return this.messageBus.invoke(this, invokableName, args) as any
  }

  interceptInvoker<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    ...args: InvokerInterceptorArgs<
      Invokables[InvokableName]['args'],
      Invokables[InvokableName]['return']
    >
  ): () => void {
    return this.messageBus.interceptInvoker(this, invokableName, args)
  }
}
