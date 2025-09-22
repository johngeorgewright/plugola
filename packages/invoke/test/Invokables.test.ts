import { AbortError, CreateInvokablesDict, Invokables } from '@plugola/invoke'
import { beforeEach, expect, Mock, test, vi } from 'vitest'

let invokables: Invokables<
  CreateInvokablesDict<{
    foo: { args: []; return: string }
    bar: { args: [string]; return: string }
    afoo: { args: [string]; return: string }
    never: { args: []; return: Promise<never> }
  }>
>
let foo: Mock<() => string>
let bar: Mock<(x: string) => string>

beforeEach(() => {
  invokables = new Invokables()
  foo = vi.fn(() => 'foo')
  bar = vi.fn((x: string) => x + '1')
  invokables.register('foo', foo)
  invokables.register('bar', bar)
  invokables.register(
    'never',
    (abortSignal) =>
      new Promise((_, reject) => {
        abortSignal.onabort = () => reject(new AbortError())
      })
  )
})

test('returning values', async () => {
  invokables.start()
  expect(await invokables.invoke('foo')).toEqual('foo')
  expect(await invokables.invoke('bar', 'hello')).toEqual('hello1')
})

test('queued messages', async () => {
  const promise = invokables.invoke('foo')
  invokables.start()
  expect(await promise).toBe('foo')
})

test('invoking unregistered', async () => {
  invokables.start()
  try {
    // @ts-ignore
    await invokables.invoke('not register')
  } catch (error) {
    expect(error).toHaveProperty(
      'message',
      'Cannot find matching invoker for "not register".'
    )
    return
  }
  throw new Error('Invoking an unregistered endpoint should error')
})

test('registering more than once', () => {
  expect(() => {
    invokables.register('foo', () => 'foo')
  }).toThrowError()

  invokables.register('afoo', 'foo', () => 'foo')
  invokables.register('afoo', 'mung', () => 'face')

  expect(() => {
    invokables.register('afoo', 'foo', () => 'foo')
  }).toThrowError()
})

test('aborting will throw AbortError', async () => {
  invokables.start()
  const result = invokables.invoke('never', AbortSignal.abort())
  await expect(result).rejects.toThrow('Async operation was aborted')
})
