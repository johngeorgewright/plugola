import type { Logger } from '@plugola/logger'

export default class Store<Action extends ActionI, State> {
  private dispatching = false
  private listeners: Listener<Action | InitAction, State>[] = []
  private running = false
  private _state: State

  constructor(
    private reducer: (action: Action | InitAction, state: State) => State,
    initialState: State,
    private log: Logger
  ) {
    this._state = Object.freeze(initialState)
  }

  get state() {
    return this._state
  }

  init() {
    this.running = true
    this.dispatch({ type: '__INIT__' })
  }

  dispatch(action: Action | InitAction) {
    if (!this.running) {
      return
    }

    if (this.dispatching) {
      throw new Error('You shouldnt dispatch actions from a reducer')
    }

    this.dispatching = true
    const state = this.reducer(action, this._state)
    this.dispatching = false

    if (state === this._state) {
      this.log(action, 'NO_CHANGE')
    } else {
      this._state = Object.freeze(state)
      this.log(action, this._state)
      this.updateSubscribers(action)
    }
  }

  subscribe(listener: Listener<Action | InitAction, State>) {
    this.listeners.push(listener)
    setTimeout(() => listener(this._state, { type: '__INIT__' }))

    return () => {
      const index = this.listeners.indexOf(listener)
      this.listeners = [
        ...this.listeners.slice(0, index),
        ...this.listeners.slice(index + 1),
      ]
    }
  }

  private updateSubscribers(action: Action | InitAction) {
    for (const listener of this.listeners) {
      listener(this._state, action)
    }
  }
}

export interface ActionI {
  type: string
}

export interface InitAction {
  type: '__INIT__'
}

interface Listener<Action extends ActionI, State> {
  (state: State, action: Action): any
}
