import { SubjectController, toArray } from '@johngw/stream'
import { Streams } from '../src'
import '@johngw/stream-jest'

let streams: Streams<{
  subjects: {
    foo: string
    bar: { a: number; b: string }
  }
  recallSubjects: {
    foo: string
    bar: number
  }
  replaySubjects: {
    foo: number
    bar: string
  }
  statefulSubjects: {
    foo: {
      actions: { inc: void }
      state: number
    }
  }
}>

beforeEach(() => {
  streams = new Streams()
})

test('accessing streams from a dictionary', async () => {
  expect(streams.fork('bar')).toBeInstanceOf(ReadableStream)
  streams.start()
  const controller = await streams.control('bar')
  expect(controller).toBeInstanceOf(SubjectController)
})

test('subscribing to a stream before it has been controlled', async () => {
  const promise = expect(streams.fork('foo')).toMatchTimeline(`
    -hello-world-
  `)

  streams.control('foo').then((controller) => {
    controller.enqueue('hello')
    controller.enqueue('world')
    controller.close()
  })

  streams.start()

  await promise
})

test('subscribing to a stream after it has been controlled', async () => {
  streams.control('foo').then((controller) => {
    controller.enqueue('hello')
    controller.enqueue('world')
    controller.close()
  })

  streams.start()

  await expect(streams.fork('foo')).toMatchTimeline(`
    -hello-world-
  `)
})

test('recall streams', async () => {
  streams.start()
  streams.controlRecall('foo').then((controller) => {
    controller.enqueue('hello')
    controller.enqueue('world')
    controller.close()
  })
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
  const p = expect(
    streams.forkState('foo').then(toArray)
  ).resolves.toMatchInlineSnapshot(
    `
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
    `
  )
  const controller = streams.controlState('foo', {
    __INIT__: () => 1,
    inc: (state) => state + 1,
  })
  controller.dispatch('inc')
  controller.close()
  streams.start()
  await p
})
