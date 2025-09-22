export class Store<Actions extends BaseActions, State> {
  #actionListeners: Partial<
    Record<keyof Actions, ActionListener<Actions[keyof Actions], State>[]>
  > = {}
  #dispatching = false
  #listeners: Listener<Actions, State>[] = []
  #staleListeners: Listener<Actions, State>[] = []
  #reducers: Reducers<Actions, State>
  #running = true
  #state!: Readonly<State>

  constructor(reducers: Reducers<Actions, State>) {
    this.#reducers = reducers
    this.dispatch('__init__', null)
  }

  get state() {
    return this.#state
  }

  deinit() {
    this.dispatch('__deinit__', null)
    this.#running = false
  }

  dispatch<Action extends keyof Actions>(
    action: Action,
    param: Actions[Action]
  ) {
    if (!this.#running) return

    if (this.#dispatching)
      throw new Error('You shouldnt dispatch actions from a reducer')

    this.#dispatching = true
    const state = this.#reduce(action, param)
    this.#dispatching = false

    if (state === this.#state) this.#updateStaleSubscribers(action, param)
    else {
      this.#state = Object.freeze(state)
      this.#updateSubscribers(action, param)
    }
  }

  on<Action extends keyof Actions>(
    action: Action,
    listener: ActionListener<Actions[Action], State>
  ): Unsubscriber {
    this.#actionListeners[action] ??= []
    return this.#subscribe(this.#actionListeners[action], listener)
  }

  subscribe(listener: Listener<Actions, State>): Unsubscriber {
    if (this.#running) listener('__init__', null, this.#state)
    return this.#subscribe(this.#listeners, listener)
  }

  subscribeToStaleEvents(listener: Listener<Actions, State>): Unsubscriber {
    return this.#subscribe(this.#staleListeners, listener)
  }

  #subscribe<T>(listeners: T[], listener: T): Unsubscriber {
    listeners.push(listener)

    return () => {
      const index = listeners.indexOf(listener)
      listeners = [...listeners.slice(0, index), ...listeners.slice(index + 1)]
    }
  }

  #reduce<Action extends keyof Actions>(
    action: Action,
    param: Actions[Action]
  ) {
    return this.#reducers[action]?.(param, this.#state) ?? this.#state
  }

  #updateSubscribers<Action extends keyof Actions>(
    action: Action,
    param: Actions[Action]
  ) {
    if (this.#actionListeners[action])
      for (const listener of this.#actionListeners[action])
        listener(param, this.#state)
    for (const listener of this.#listeners) listener(action, param, this.#state)
  }

  #updateStaleSubscribers<Action extends keyof Actions>(
    action: Action,
    param: Actions[Action]
  ) {
    for (const listener of this.#staleListeners)
      listener(action, param, this.#state)
  }
}

export interface BaseActions {
  __init__: null
  __deinit__?: null
}

export interface Reducer<Param, State> {
  (param: Param, state: Readonly<State>): Readonly<State>
}

export type Reducers<Actions extends BaseActions, State> = {
  [Action in keyof Actions]: Reducer<Actions[Action], State>
}

export interface Listener<Actions extends BaseActions, State> {
  <Action extends keyof Actions>(
    action: Action,
    param: Actions[Action],
    state: Readonly<State>
  ): any
}

export interface ActionListener<Param, State> {
  (param: Param, state: Readonly<State>): any
}

export interface Unsubscriber {
  (): void
}
