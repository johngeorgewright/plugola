import { Unsubscriber } from './types/MessageBus.js'

export default class SubscriptionDisposer {
  #unsubscribers = new Set<Unsubscriber>()

  add(unsubscriber: Unsubscriber) {
    this.#unsubscribers.add(unsubscriber)
  }

  dispose() {
    for (const unsubscribe of this.#unsubscribers) {
      unsubscribe()
    }
  }
}
