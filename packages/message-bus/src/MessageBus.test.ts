import Broker from './Broker'
import MessageBus from './MessageBus'
import { CancelEvent } from './symbols'
import { timeout } from '@johngw/async'

describe('events', () => {
  type Events = { foo: []; bar: [string] }
  let messageBus: MessageBus<Events, {}>
  let broker: Broker<Events, {}>
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
})

describe('invokables', () => {
  type Invokables = {
    foo: { args: []; return: string }
    bar: { args: [string]; return: string }
    afoo: { args: []; return: Promise<string> }
  }
  let messageBus: MessageBus<{}, Invokables>
  let broker: Broker<{}, Invokables>
  let foo: jest.Mock<string>
  let bar: jest.Mock<string, [string]>
  let afoo: jest.Mock<Promise<string>>

  beforeEach(() => {
    messageBus = new MessageBus()
    broker = messageBus.broker('test')
    foo = jest.fn(() => 'foo')
    bar = jest.fn((x: string) => x + '1')
    afoo = jest.fn(async () => foo())
    broker.register('foo', foo)
    broker.register('bar', bar)
    broker.register('afoo', afoo)
  })

  test('returning values', () => {
    messageBus.start()
    expect(broker.invoke('foo')).toEqual(['foo'])
    expect(broker.invoke('bar', 'hello')).toEqual(['hello1'])
  })

  test('queued messages', async () => {
    const result = broker.invoke('foo')
    expect(foo).not.toHaveBeenCalled()
    await messageBus.start()
    expect(await result).toEqual(['foo'])
  })

  test('asynchronous handlers', async () => {
    messageBus.start()
    const result = broker.invoke('afoo')
    expect(result).toMatchInlineSnapshot(`
      Array [
        Promise {},
      ]
    `)
  })

  test('intercept invokers', async () => {
    messageBus.start()
    broker.interceptInvoker('bar', (x) => [x + '1'])
    expect(await broker.invoke('bar', 'hello')).toEqual(['hello11'])
  })
})
