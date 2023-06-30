import { SubjectController, toArray } from '@johngw/stream'
import { Streams } from '../src'
import '@johngw/stream-jest'

let streams: Streams<
  {
    foo: string
    bar: { a: number; b: string }
  },
  {
    foo: string
    bar: number
  },
  {
    foo: number
    bar: string
  },
  {
    foo: {
      actions: { inc: void }
      state: number
    }
  }
>

beforeEach(() => {
  streams = new Streams()
})

test('accessing streams from a dictionary', async () => {
  expect(streams.fork('bar')).toBeInstanceOf(ReadableStream)
  expect(streams.control('bar')).toBeInstanceOf(Promise)
  streams.start()
  expect(await streams.control('bar')).toBeInstanceOf(SubjectController)
})

test('subscribing to a stream before it has been controlled', async () => {
  const promise = Promise.all([
    expect(streams.fork('foo')).toMatchTimeline(`
      -hello-world-
    `),

    streams.control('foo').then((controller) => {
      controller.enqueue('hello')
      controller.enqueue('world')
      controller.close()
    }),
  ])

  streams.start()

  await promise
})

test('subscribing to a stream after it has been controlled', async () => {
  const promise = Promise.all([
    streams.control('foo').then((controller) => {
      controller.enqueue('hello')
      controller.enqueue('world')
      controller.close()
    }),

    expect(streams.fork('foo')).toMatchTimeline(`
      -hello-world-
    `),
  ])

  streams.start()

  await promise
})

test('recall streams', async () => {
  streams.start()
  const controller = await streams.controlRecall('foo')
  controller.enqueue('hello')
  controller.enqueue('world')
  controller.close()
  expect(await toArray(streams.forkRecall('foo'))).toEqual(['hello', 'world'])
  expect(await toArray(streams.forkRecall('foo'))).toEqual(['world'])
  expect(await toArray(streams.forkRecall('foo'))).toEqual(['world'])
})

test('replay streams', async () => {
  streams.start()
  const controller = streams.controlReplay('bar')
  controller.enqueue('hello')
  controller.enqueue('world')
  controller.close()
  expect(await toArray(streams.forkReplay('bar'))).toEqual(['hello', 'world'])
  expect(await toArray(streams.forkReplay('bar'))).toEqual(['hello', 'world'])
  expect(await toArray(streams.forkReplay('bar'))).toEqual(['hello', 'world'])
})

test('stateful streams', async () => {
  streams.start()
  const promise = streams.forkState('foo').then(toArray)
  const controller = streams.controlState('foo', {
    __INIT__: () => 1,
    inc: (state) => state + 1,
  })
  controller.dispatch('inc')
  controller.close()
  expect(await promise).toMatchInlineSnapshot(`
    [
      {
        "action": "__INIT__",
        "state": 1,
      },
      {
        "action": "inc",
        "param": undefined,
        "state": 2,
      },
    ]
  `)
})
