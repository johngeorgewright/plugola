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

  test('queued events', async () => {
    broker.emit('foo')
    broker.emit('bar', 'hello world')

    expect(foo).not.toHaveBeenCalled()
    expect(bar).not.toHaveBeenCalled()

    await messageBus.start()
    expect(foo).toHaveBeenCalled()
    expect(bar).toHaveBeenCalledWith('hello world')
  })

  test('intercepting args', async () => {
    messageBus.start()
    broker.intercept('bar', async (x) => [x + '1'])
    await broker.emit('bar', 'hello')
    expect(bar).toHaveBeenCalledWith('hello1')
  })

  test('cancelling with interception', async () => {
    messageBus.start()
    broker.intercept('foo', async () => CancelEvent)
    await broker.emit('foo')
    expect(foo).not.toHaveBeenCalled()
  })
})

function timeout(ms: number = 0) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}
