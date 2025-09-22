import { beforeEach, expect, test, vi } from 'vitest'
import { BaseActions, Store } from '../src/Store.js'

interface Actions extends BaseActions {
  foo: string
  bar: null
}

interface State {
  foo: string
}

let store: Store<Actions, State>

beforeEach(() => {
  store = new Store<Actions, State>({
    __init__: () => ({ foo: '' }),
    foo: (foo, state) => ({ ...state, foo }),
    bar: (_, state) => (state.foo === 'bar' ? state : { ...state, foo: 'bar' }),
  })
})

test('state management', () => {
  expect(store.state).toEqual({ foo: '' })
  store.dispatch('bar', null)
  // @ts-expect-error
  store.dispatch('bar', 'error')
  expect(store.state).toEqual({ foo: 'bar' })
  store.dispatch('foo', 'mung')
  expect(store.state).toEqual({ foo: 'mung' })
})

test('subscribing to state changes', () => {
  const onUpdate = vi.fn()
  store.subscribe(onUpdate)
  store.dispatch('bar', null)
  expect(onUpdate).toHaveBeenCalledWith('bar', null, { foo: 'bar' })
})

test('stale subscribers', () => {
  const subscriber = vi.fn()
  store.subscribeToStaleEvents(subscriber)
  store.dispatch('bar', null)
  expect(subscriber).not.toHaveBeenCalled()
  store.dispatch('bar', null)
  expect(subscriber).toHaveBeenCalledWith('bar', null, { foo: 'bar' })
})

test('action listeners', () => {
  const subscriber = vi.fn()
  store.on('bar', subscriber)
  store.dispatch('bar', null)
  store.dispatch('bar', null)
  expect(subscriber).toHaveBeenCalledTimes(1)
  expect(subscriber).toHaveBeenCalledWith(null, { foo: 'bar' })
})
