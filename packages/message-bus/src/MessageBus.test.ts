import Broker from './Broker'
import MessageBus from './MessageBus'
import { CancelEvent } from './symbols'
import { timeout } from '@johngw/async'

describe('events', () => {
  type Events = { foo: []; bar: [string] }
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
    expect(bar).toHaveBeenCalledWith('hello world')
  })

  test('queued events', () => {
    broker.emit('foo')
    broker.emit('bar', 'hello world')

    expect(foo).not.toHaveBeenCalled()
    expect(bar).not.toHaveBeenCalled()

    messageBus.start()
    expect(foo).toHaveBeenCalled()
    expect(bar).toHaveBeenCalledWith('hello world')
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
    expect(await result).toEqual(['hello'])
  })

  test('intercepting events', async () => {
    messageBus.start()
    broker.interceptEvent('bar', (x) => [x + '1'])
    await broker.emit('bar', 'hello')
    expect(bar).toHaveBeenCalledWith('hello1')
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
    broker.on('bar', 'mung', fn)
    broker.emit('bar', 'mung')
    broker.emit('bar', 'face')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith()
  })
})

describe('iterators', () => {
  type Iterables = {
    foo: { args: []; yield: string }
    bar: { args: [string]; yield: string }
  }
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

    messageBus.start()
    for await (const result of broker.iterate('bar', 'mung')) {
      results.push(result)
    }

    expect(results).toEqual(['mung', 'face'])
  })
})

describe('invokables', () => {
  type Invokables = {
    foo: { args: []; return: string }
    bar: { args: [string]; return: string }
    afoo: { args: [string]; return: Promise<string> }
  }
  let messageBus: MessageBus<{}, {}, Invokables>
  let broker: Broker<{}, {}, Invokables>
  let foo: jest.Mock<string>
  let bar: jest.Mock<string, [string]>
  let afoo: jest.Mock<Promise<string>>

  beforeEach(() => {
    messageBus = new MessageBus()
    broker = messageBus.broker('test')
    foo = jest.fn(() => 'foo')
    bar = jest.fn((x: string) => x + '1')
    afoo = jest.fn(async (x: string) => bar(x))
    broker.register('foo', foo)
    broker.register('bar', bar)
    broker.register('afoo', afoo)
  })

  test('returning values', () => {
    messageBus.start()
    expect(broker.invoke('foo')).toEqual('foo')
    expect(broker.invoke('bar', 'hello')).toEqual('hello1')
  })

  test('queued messages', () => {
    expect(() => {
      broker.invoke('foo')
    }).toThrowError()
  })

  test('invoking unregistered', () => {
    expect(() => {
      // @ts-ignore
      broker.invoke('not register')
    }).toThrowError()
  })

  test('registering more than once', () => {
    expect(() => {
      broker.register('foo', () => 'foo')
    }).toThrowError()
  })

  test('intercept invokers', () => {
    messageBus.start()
    broker.interceptInvoker('bar', (x) => [x + '1'])
    expect(broker.invoke('bar', 'hello')).toEqual('hello11')
  })

  test('intercept asynchonous invokers', async () => {
    messageBus.start()
    broker.interceptInvoker('afoo', async (x) => [x + 1])
    expect(await broker.invoke('afoo', 'hello')).toEqual('hello11')
  })
})
