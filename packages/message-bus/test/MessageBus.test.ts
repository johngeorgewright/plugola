import Broker from '../src/Broker'
import MessageBus from '../src/MessageBus'
import { CancelEvent } from '../src/symbols'
import { AbortError, timeout } from '@johngw/async'
import MessageBusError from '../src/MessageBusError'
import { AbortSignalComposite } from '../src/AbortController'
import { CreateEvents } from '../src/types/events'
import { CreateInvokablesDict } from '../src/types/invokables'
import { CreateEventGenerators } from '../src/types/generators'

describe('events', () => {
  type Events = CreateEvents<{ foo: []; bar: [string]; mung: [string, number] }>
  let messageBus: MessageBus<Events, {}, {}>
  let broker: Broker<Events, {}, {}>
  let foo: jest.Mock<void, []>
  let bar: jest.Mock<void, [string]>

  beforeEach(() => {
    messageBus = new MessageBus()
    broker = messageBus.broker('test')
    foo = jest.fn()
    bar = jest.fn()
    broker.on('foo', foo)
    broker.on('bar', bar)
  })

  test('events', () => {
    messageBus.start()
    broker.emit('foo')
    broker.emit('bar', 'hello world')
    expect(foo).toHaveBeenCalled()
    expect(bar).toHaveBeenCalledWith(
      'hello world',
      expect.any(AbortSignalComposite)
    )
  })

  test('queued events', () => {
    broker.emit('foo')
    broker.emit('bar', 'hello world')

    expect(foo).not.toHaveBeenCalled()
    expect(bar).not.toHaveBeenCalled()

    messageBus.start()
    expect(foo).toHaveBeenCalled()
    expect(bar).toHaveBeenCalledWith(
      'hello world',
      expect.any(AbortSignalComposite)
    )
  })

  test('can wait for all asynchronous listeners', async () => {
    const fn = jest.fn()
    messageBus.start()
    broker.on('foo', async () => {
      await timeout()
      fn()
    })
    await broker.emit('foo')
    expect(fn).toHaveBeenCalled()
  })

  test('once listeners', () => {
    const fn = jest.fn()
    messageBus.start()
    broker.once('foo', fn)
    broker.emit('foo')
    broker.emit('foo')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('until listeners', async () => {
    messageBus.start()
    const result = broker.until('bar')
    broker.emit('bar', 'hello')
    expect(await result).toEqual(['hello', expect.any(AbortSignalComposite)])
  })

  test('partial until listeners', (done) => {
    const fn = jest.fn()
    messageBus.start()
    broker.until('bar', 'hello').then(fn)
    broker.emit('bar', 'no')
    setImmediate(() => {
      expect(fn).not.toHaveBeenCalled()
      broker.emit('bar', 'hello')
      setImmediate(() => {
        expect(fn).toHaveBeenCalledWith([expect.any(AbortSignalComposite)])
        done()
      })
    })
  })

  test('intercepting events', async () => {
    messageBus.start()
    broker.interceptEvent('bar', (x) => [x + '1'])
    await broker.emit('bar', 'hello')
    expect(bar).toHaveBeenCalledWith('hello1', expect.any(AbortSignalComposite))
  })

  test('cancelling events with interception', async () => {
    messageBus.start()
    broker.interceptEvent(
      'foo',
      async (): Promise<typeof CancelEvent> => CancelEvent
    )
    await broker.emit('foo')
    expect(foo).not.toHaveBeenCalled()
  })

  test('partial subscribers', () => {
    const fn = jest.fn()
    messageBus.start()
    broker.on('mung', 'face', fn)
    broker.emit('mung', 'mung', 1)
    broker.emit('mung', 'face', 2)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(2, expect.any(AbortSignalComposite))
  })

  test('aborting removes subscribers', () => {
    messageBus.start()
    broker.abort()
    broker.emit('foo')
    expect(foo).not.toHaveBeenCalled()
  })

  test('aborting cancels queued emits', async () => {
    const onAbort = jest.fn()
    broker.emit('foo')
    broker.abort()
    messageBus.onError(onAbort)
    await messageBus.start()
    expect(foo).not.toHaveBeenCalled()
    expect(onAbort).toHaveBeenCalled()
    expect(onAbort.mock.calls[0][0].message).toBe(
      'test[foo]: Async operation was aborted'
    )
  })
})

describe('iterators', () => {
  type Iterables = CreateEventGenerators<{
    foo: { args: []; yield: string }
    bar: { args: [string]; yield: string }
  }>
  let messageBus: MessageBus<{}, Iterables, {}>
  let broker: Broker<{}, Iterables, {}>

  beforeEach(() => {
    messageBus = new MessageBus()
    broker = messageBus.broker('test')
  })

  test('yielding', async () => {
    const results = []

    broker.generator('foo', async function* () {
      yield 'hello'
      yield 'world'
    })

    broker.generator('foo', async function* () {
      yield 'moo'
      yield 'car'
    })

    messageBus.start()
    for await (const result of broker.iterate('foo')) {
      results.push(result)
    }

    expect(results).toEqual(['hello', 'world', 'moo', 'car'])
  })

  test('partial subscribers', async () => {
    const results = []

    broker.generator('bar', async function* (str) {
      yield str
    })

    broker.generator('bar', 'mung', async function* () {
      yield 'face'
    })

    broker.generator('bar', 'shouldIgnore', async function* () {
      yield 'ERROR'
    })

    messageBus.start()
    for await (const result of broker.iterate('bar', 'mung')) {
      results.push(result)
    }

    expect(results).toEqual(['mung', 'face'])
  })
})

describe('invokables', () => {
  type Invokables = CreateInvokablesDict<{
    foo: { args: []; return: string }
    bar: { args: [string]; return: string }
    afoo: { args: [string]; return: string }
    never: { args: []; return: Promise<never> }
  }>
  let messageBus: MessageBus<{}, {}, Invokables>
  let broker: Broker<{}, {}, Invokables>
  let foo: jest.Mock<string>
  let bar: jest.Mock<string, [string]>

  beforeEach(() => {
    messageBus = new MessageBus()
    broker = messageBus.broker('test')
    foo = jest.fn(() => 'foo')
    bar = jest.fn((x: string) => x + '1')
    broker.register('foo', foo)
    broker.register('bar', bar)
    broker.register(
      'never',
      (abortSignal) =>
        new Promise((_, reject) => {
          abortSignal.onabort = () => reject(new AbortError())
        })
    )
  })

  test('returning values', async () => {
    messageBus.start()
    expect(await broker.invoke('foo')).toEqual('foo')
    expect(await broker.invoke('bar', 'hello')).toEqual('hello1')
  })

  test('queued messages', async () => {
    const promise = broker.invoke('foo')
    messageBus.start()
    expect(await promise).toBe('foo')
  })

  test('invoking unregistered', async () => {
    messageBus.start()
    try {
      // @ts-ignore
      await broker.invoke('not register')
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
      broker.register('foo', () => 'foo')
    }).toThrowError()

    broker.register('afoo', 'foo', () => 'foo')
    broker.register('afoo', 'mung', () => 'face')

    expect(() => {
      broker.register('afoo', 'foo', () => 'foo')
    }).toThrowError()
  })

  test('intercept invokers', async () => {
    messageBus.start()
    broker.interceptInvoker('bar', (next, x) => next(x + '1'))
    expect(await broker.invoke('bar', 'hello')).toEqual('hello11')
  })

  test('intercepting with indexed parameters', async () => {
    messageBus.start()
    const match = 'hello'
    broker.interceptInvoker('bar', match, async (next) => {
      const result = await next(match)
      return result + ' foo'
    })
    expect(await broker.invoke('bar', 'no intercept')).toEqual('no intercept1')
    expect(await broker.invoke('bar', 'hello')).toEqual('hello1 foo')
  })

  test('aborting will throw AbortError', async () => {
    messageBus.start()
    const result = broker.invoke('never')
    broker.abort()
    await expect(result).rejects.toThrow('Async operation was aborted')
  })
})

describe('error handling', () => {
  type Events = { foo: []; bar: [string] }
  let messageBus: MessageBus<Events, {}, {}>
  let broker: Broker<Events, {}, {}>

  beforeEach(() => {
    messageBus = new MessageBus()
    broker = messageBus.broker('test')
  })

  test('immediately throing errors inside subscribers', (done) => {
    messageBus.start()
    messageBus.onError((error) => {
      expect(error).toBeInstanceOf(MessageBusError)
      expect(error.message).toBe('test[foo]: Foo errored')
      done()
    })
    broker.on('foo', () => {
      throw new Error('Foo errored')
    })
    broker.emit('foo')
  })

  test('queuing errors inside subscribers', (done) => {
    messageBus.onError((error) => {
      expect(error).toBeInstanceOf(MessageBusError)
      expect(error.message).toBe('test[foo]: Foo errored')
      done()
    })
    broker.on('foo', () => {
      throw new Error('Foo errored')
    })
    broker.emit('foo')
    messageBus.start()
  })
})
