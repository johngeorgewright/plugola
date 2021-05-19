import type MessageBus from './MessageBus'
import type {
  EventsT,
  EventInterceptorArgs,
  InvokablesT,
  SubscriberArgs,
  UntilArgs,
  UntilRtn,
  InvokerInterceptorArgs,
  InvokerFn,
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
    return this.messageBus.once(this, eventName, args)
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
    return this.messageBus.until(this, eventName, args)
  }

  register<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    invoker: InvokerFn<
      Invokables[InvokableName]['args'],
      Invokables[InvokableName]['return']
    >
  ): () => void {
    return this.messageBus.register(this, invokableName, invoker)
  }

  invoke<InvokableName extends keyof Invokables>(
    invokableName: InvokableName,
    ...args: Invokables[InvokableName]['args']
  ): Invokables[InvokableName]['return'] {
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
