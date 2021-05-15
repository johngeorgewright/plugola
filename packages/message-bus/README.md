# @plugola/message-bus

Plugola event management

## Examples

### Simple Event Handling

```typescript
const messageBus = new MessageBus<
  {
    foo: [string]
    bar: [number, number]
  },
  {}
>()

messageBus.start()

const broker = messageBus.broker('broker name')

broker.on('foo', (str) => {
  console.info(str)
})

broker.on('bar', (num1, num2) => {
  console.info(num1 + num2)
})

broker.emit('foo', 'hello world')
broker.emit('bar', 1, 2)
```

### Queued Events

Events are queued until, you call `messageBus.start()`.

```typescript
const messageBus = new MessageBus<{ foo: [string] }, {}>()
const broker = messageBus.broker('my broker')

broker.on('foo', () =>
  console.info("I'll log once messageBus.start() is called")
)
broker.emit('foo')

messageBus.start()
```

### Subcription Specificity

You can narrow down you subsciption by the arguments emitted.

```typescript
const messageBus = new MessageBus<{ foo: [string, string] }, {}>()
const broker = messageBus.broker('my broker')

messageBus.start()

broker.on('foo', 'bar', 'bazzle', () => {
  console.info('I only care when foo is emitted with "bar" and "bazzle"')
})

broker.emit('foo', 'rab', 'elzzab') // no subscriptions registered for this event
broker.emit('foo', 'bar', 'bazzle')
```

### Event Interception

You can intercept messages to modify their arguments.

```typescript
const messageBus = new MessageBus<{ foo: [string] }, {}>()
const broker = messageBus.broker('my broker')

messageBus.start()

broker.intercept('foo', (str) => [str.reverse()])

broker.on('foo', console.info) // rab

broker.emit('foo', 'bar')
```

You can also cancel the event completely.

```typescript
import { CancelEvent } from '@plugpola/message-bus'

broker.intercept('foo', () => CancelEvent)

broker.emit('foo') // no subscriptions will get called
```
