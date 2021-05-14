import Broker from './Broker'
import MessageBus from './MessageBus'
import { CancelEvent } from './symbols'

describe('events', () => {
  type Events = { foo: []; bar: [string] }
  let messageBus: MessageBus<Events>
  let broker: Broker<Events>
  let foo: jest.Mock
  let bar: jest.Mock

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
    broker.intercept('bar', async (x) => [x + '1'])
    await broker.emit('bar', 'hello')
    expect(bar).toHaveBeenCalledWith('hello1')
  })

  test('cancelling events with interception', async () => {
    messageBus.start()
    broker.intercept('foo', async () => CancelEvent)
    await broker.emit('foo')
    expect(foo).not.toHaveBeenCalled()
  })
})
