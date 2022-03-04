export class Store<Actions extends BaseActions, State> {
  #dispatching = false
  #listeners: Listener<Actions, State>[] = []
  #staleListeners: Listener<Actions, State>[] = []
  #reducers: Reducers<Actions, State>
  #running = false
  #state: Readonly<State>

  constructor(initialState: State, reducers: Reducers<Actions, State>) {
    this.#reducers = reducers
    this.#state = Object.freeze(initialState)
  }

  get state() {
    return this.#state
  }

  init() {
    this.#running = true
    this.dispatch('__INIT__', null)
  }

  deinit() {
    this.dispatch('__DEINIT__', null)
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

  subscribe(listener: Listener<Actions, State>) {
    this.#listeners.push(listener)

    if (this.#running) listener('__INIT__', null, this.#state)

    return () => {
      const index = this.#listeners.indexOf(listener)
      this.#listeners = [
        ...this.#listeners.slice(0, index),
        ...this.#listeners.slice(index + 1),
      ]
    }
  }

  subscribeToStaleEvents(listener: Listener<Actions, State>) {
    this.#staleListeners.push(listener)

    return () => {
      const index = this.#staleListeners.indexOf(listener)
      this.#staleListeners = [
        ...this.#staleListeners.slice(0, index),
        ...this.#staleListeners.slice(index + 1),
      ]
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
    for (const listener of this.#listeners)
      listener(action, param, this.#state)?.()
  }

  #updateStaleSubscribers<Action extends keyof Actions>(
    action: Action,
    param: Actions[Action]
  ) {
    for (const listener of this.#staleListeners)
      listener(action, param, this.#state)?.()
  }
}

export interface BaseActions {
  __INIT__?: null
  __DEINIT__?: null
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
  ): void | (() => void)
}
