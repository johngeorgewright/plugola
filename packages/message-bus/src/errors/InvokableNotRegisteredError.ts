import MessageBus from '../MessageBus'

export class InvokableNotRegisteredError extends Error {
  #messageBus: MessageBus
  #invokableName: string

  constructor(messageBus: MessageBus, invokableName: string) {
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
