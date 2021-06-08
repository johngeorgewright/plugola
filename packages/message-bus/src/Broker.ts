import type MessageBus from './MessageBus'
import type {
  EventsT,
  EventInterceptorArgs,
  InvokablesT,
  SubscriberArgs,
  UntilArgs,
  UntilRtn,
  InvokerInterceptorArgs,
  EventGeneratorsT,
  EventGeneratorArgs,
  InvokerRegistrationArgs,
} from './types'

export default class Broker<
  Events extends EventsT = EventsT,
  EventGens extends EventGeneratorsT = EventGeneratorsT,
  Invokables extends InvokablesT = InvokablesT
> {
  constructor(
    private readonly messageBus: MessageBus<Events, EventGens, Invokables>,
    public readonly id: string
  ) {}

  emit<EventName extends keyof Events>(
    eventName: EventName,
    ...args: Events[EventName]
  ): void | Promise<void> {
    // @ts-ignore
    return this.messageBus.emit(this, eventName, args)
  }

  interceptEvent<EventName extends keyof Events>(
    eventName: EventName,
    ...args: EventInterceptorArgs<Events[EventName]>
  ): () => void {
    return this.messageBus.interceptEvent(this as any, eventName, args)
  }

  on<EventName extends keyof Events>(
    eventName: EventName,
    ...args: SubscriberArgs<Events[EventName]>
  ): () => void {
    return this.messageBus.on(this as any, eventName, args)
  }

  once<EventName extends keyof Events>(
    eventName: EventName,
    ...args: SubscriberArgs<Events[EventName]>
  ): () => void {
    return this.messageBus.once(this as any, eventName, args)
  }

  hasSubscriber(eventName: keyof Events) {
    return this.messageBus.hasSubscriber(eventName)
  }

  async until<
    EventName extends keyof Events,
    Args extends UntilArgs<Events[EventName]>
  >(
    eventName: EventName,
    ...args: Args
  ): Promise<UntilRtn<Events[EventName], Args>> {
    // @ts-ignore
    return this.messageBus.until(this, eventName, args)
  }

  generator<EventName extends keyof EventGens>(
    eventName: EventName,
    ...args: EventGeneratorArgs<
      EventGens[EventName]['args'],
      EventGens[EventName]['yield']
    >
  ): () => void {
    return this.messageBus.generator(this, eventName, args)
  }

  iterate<EventName extends keyof EventGens>(
    eventName: EventName,
    ...args: EventGens[EventName]['args']
  ): AsyncIterable<EventGens[EventName]['yield']> {
    return this.messageBus.iterate(this, eventName, args)
  }

  iterateWithin<EventName extends keyof EventGens>(
    within: number,
    eventName: EventName,
    ...args: EventGens[EventName]['args']
  ): AsyncIterable<EventGens[EventName]['yield']> {
    return this.messageBus.iterateWithin(this, within, eventName, args)
  }

  accumulate<EventName extends keyof EventGens>(
    eventName: EventName,
    ...args: EventGens[EventName]['args']
  ): Promise<EventGens[EventName]['yield'][]> {
    return this.messageBus.accumulate(this, eventName, args)
  }

  register<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    ...args: InvokerRegistrationArgs<
      Invokables[InvokableName]['args'],
      Invokables[InvokableName]['return']
    >
  ): () => void {
    return this.messageBus.register(this, invokableName, args)
  }

  invoke<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    ...args: Invokables[InvokableName]['args']
  ): Promise<Invokables[InvokableName]['return']> {
    return this.messageBus.invoke(this, invokableName, args) as any
  }

  interceptInvoker<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    ...args: InvokerInterceptorArgs<Invokables[InvokableName]['args']>
  ): () => void {
    return this.messageBus.interceptInvoker(this, invokableName, args)
  }
}
