export default class Store<Action extends ActionI, State> {
  #dispatching = false
  #listeners: Listener<Action, State>[] = []
  #staleListeners: Listener<Action, State>[] = []
  #reducer: Reducer<Action, State>
  #running = false
  #state: Readonly<State>

  constructor(reducer: Reducer<Action, State>, initialState: State) {
    this.#reducer = reducer
    this.#state = Object.freeze(initialState)
  }

  get state() {
    return this.#state
  }

  init() {
    this.#running = true
    this.dispatch({ type: '__INIT__' })
  }

  dispatch(action: Action | InitAction) {
    if (!this.#running) {
      return
    }

    if (this.#dispatching) {
      throw new Error('You shouldnt dispatch actions from a reducer')
    }

    this.#dispatching = true
    const state = this.#reducer(action, this.#state)
    this.#dispatching = false

    if (state === this.#state) {
      this.#updateStaleSubscribers(action)
    } else {
      this.#state = Object.freeze(state)
      this.#updateSubscribers(action)
    }
  }

  subscribe(listener: Listener<Action, State>) {
    this.#listeners.push(listener)

    if (this.#running) listener({ type: '__INIT__' }, this.#state)

    return () => {
      const index = this.#listeners.indexOf(listener)
      this.#listeners = [
        ...this.#listeners.slice(0, index),
        ...this.#listeners.slice(index + 1),
      ]
    }
  }

  subscribeToStaleEvents(listener: Listener<Action, State>) {
    this.#staleListeners.push(listener)

    return () => {
      const index = this.#staleListeners.indexOf(listener)
      this.#staleListeners = [
        ...this.#staleListeners.slice(0, index),
        ...this.#staleListeners.slice(index + 1),
      ]
    }
  }

  #updateSubscribers(action: Action | InitAction) {
    for (const listener of this.#listeners) {
      listener(action, this.#state)
    }
  }

  #updateStaleSubscribers(action: Action | InitAction) {
    for (const listener of this.#staleListeners) {
      listener(action, this.#state)
    }
  }
}

export interface ActionI {
  type: string
}

export interface InitAction {
  type: '__INIT__'
}

export type Reducer<Action extends ActionI, State> = (
  action: Readonly<Action | InitAction>,
  state: Readonly<State>
) => Readonly<State>

export type Listener<Action extends ActionI, State> = (
  action: Readonly<Action | InitAction>,
  state: Readonly<State>
) => any
