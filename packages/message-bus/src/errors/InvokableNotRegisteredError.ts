import { InvokablesDict } from '@plugola/invoke'
import MessageBus from '../MessageBus.js'
import { EventsT } from '../types/events.js'
import { EventGeneratorsT } from '../types/generators.js'

export class InvokableNotRegisteredError<
  Events extends EventsT,
  EventGens extends EventGeneratorsT,
  Invokables extends InvokablesDict
> extends Error {
  #messageBus: MessageBus<Events, EventGens, Invokables>
  #invokableName: string

  constructor(
    messageBus: MessageBus<Events, EventGens, Invokables>,
    invokableName: string
  ) {
    super(`Cannot find matching invoker for "${invokableName}".`)
    this.#messageBus = messageBus
    this.#invokableName = invokableName
  }

  get messageBus() {
    return this.#messageBus
  }

  get invokableName() {
    return this.#invokableName
  }
}
