import Store from './Store'

interface FooAction {
  type: 'foo'
  foo: string
}

interface BarAction {
  type: 'bar'
}

type Action = FooAction | BarAction

interface State {
  foo: string
}

let store: Store<Action, State>

jest.useFakeTimers()

beforeEach(() => {
  store = new Store(
    (action, state) => {
      switch (action.type) {
        case 'foo':
          return { ...state, foo: action.foo }
        case 'bar':
          return state.foo === 'bar' ? state : { ...state, foo: 'bar' }
        default:
          return state
      }
    },
    { foo: '' }
  )

  store.init()
})

test('state management', () => {
  expect(store.state).toEqual({ foo: '' })
  store.dispatch({ type: 'bar' })
  expect(store.state).toEqual({ foo: 'bar' })
  store.dispatch({ type: 'foo', foo: 'mung' })
  expect(store.state).toEqual({ foo: 'mung' })
})

test('subscribing to state changes', () => {
  const onUpdate = jest.fn()
  store.subscribe(onUpdate)
  jest.runAllTimers()
  expect(onUpdate).toHaveBeenCalledWith({ type: '__INIT__' }, { foo: '' })
  store.dispatch({ type: 'bar' })
  expect(onUpdate).toHaveBeenCalledWith({ type: 'bar' }, { foo: 'bar' })
})

test('stale subscribers', () => {
  const subscriber = jest.fn()
  store.subscribeToStaleEvents(subscriber)
  store.dispatch({ type: 'bar' })
  expect(subscriber).not.toHaveBeenCalled()
  store.dispatch({ type: 'bar' })
  expect(subscriber).toHaveBeenCalledWith({ type: 'bar' }, { foo: 'bar' })
})
