import Store, { InitAction } from './Store'

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
  store = new Store(reduce, { foo: '' }, jest.fn() as any)
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

function reduce(action: Action | InitAction, state: State) {
  switch (action.type) {
    case 'foo':
      return { ...state, foo: action.foo }
    case 'bar':
      return { ...state, foo: 'bar' }
    default:
      return state
  }
}
