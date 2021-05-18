import Logger, { DisabledLoggerBehavior } from '@plugola/logger'

export default class Store<Action extends ActionI, State> {
  private dispatching = false
  private listeners: Listener<Action, State>[] = []
  private running = false
  private _state: State

  constructor(
    private reducer: Reducer<Action, State>,
    initialState: State,
    private log: Logger = new Logger('store', new DisabledLoggerBehavior())
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
      this.log.info(action, 'NO_CHANGE')
    } else {
      this._state = Object.freeze(state)
      this.log.info(action, this._state)
      this.updateSubscribers(action)
    }
  }

  subscribe(listener: Listener<Action, State>) {
    this.listeners.push(listener)
    setTimeout(() => listener({ type: '__INIT__' }, this._state))

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
      listener(action, this._state)
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
