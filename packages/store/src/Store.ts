import Logger, { DisabledLoggerBehavior } from '@plugola/logger'

export default class Store<Action extends ActionI, State> {
  #dispatching = false
  #listeners: Listener<Action, State>[] = []
  #log: Logger
  #reducer: Reducer<Action, State>
  #running = false
  #state: State

  constructor(
    reducer: Reducer<Action, State>,
    initialState: State,
    log: Logger = new Logger('store', new DisabledLoggerBehavior())
  ) {
    this.#log = log
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
      this.#log.info(action, 'NO_CHANGE')
    } else {
      this.#state = Object.freeze(state)
      this.#log.info(action, this.#state)
      this.#updateSubscribers(action)
    }
  }

  subscribe(listener: Listener<Action, State>) {
    this.#listeners.push(listener)
    setTimeout(() => listener({ type: '__INIT__' }, this.#state))

    return () => {
      const index = this.#listeners.indexOf(listener)
      this.#listeners = [
        ...this.#listeners.slice(0, index),
        ...this.#listeners.slice(index + 1),
      ]
    }
  }

  #updateSubscribers(action: Action | InitAction) {
    for (const listener of this.#listeners) {
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
  action: Action | InitAction,
  state: State
) => State

export type Listener<Action extends ActionI, State> = (
  action: Action | InitAction,
  state: State
) => any
