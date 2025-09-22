// import { fromCollection, toArray } from '@johngw/stream'
import { Streams } from '@plugola/streams'
import { beforeEach, expect, test } from 'vitest'
import { expectTimeline } from './stream-vitest.js'
import { fromCollection, toArray } from '@johngw/stream'

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

test('subscribing to a stream before it has been controlled', async () => {
  const promise = streams.fork('foo').pipeTo(expectTimeline('-hello-world-'))

  const controller = streams.control('foo')
  controller.enqueue('hello')
  controller.enqueue('world')
  controller.close()

  streams.start()

  await promise
})

test('subscribing to a stream after it has been controlled', async () => {
  const controller = streams.control('foo')
  controller.enqueue('hello')
  controller.enqueue('world')
  controller.close()

  streams.start()

  await streams.fork('foo').pipeTo(expectTimeline('-hello-world-'))
})

test('recall streams', async () => {
  streams.start()
  const controller = streams.controlRecall('foo')
  controller.enqueue('hello')
  controller.enqueue('world')
  controller.close()
  expect(await toArray(streams.forkRecall('foo'))).toEqual(['hello', 'world'])
  expect(await toArray(streams.forkRecall('foo'))).toEqual(['world'])
  expect(await toArray(streams.forkRecall('foo'))).toEqual(['world'])
})

test('replay streams', async () => {
  streams.start()
  fromCollection(['hello', 'world']).pipeTo(streams.writeReplay('bar'))
  expect(await toArray(streams.forkReplay('bar'))).toEqual(['hello', 'world'])
  expect(await toArray(streams.forkReplay('bar'))).toEqual(['hello', 'world'])
  expect(await toArray(streams.forkReplay('bar'))).toEqual(['hello', 'world'])
})

test('stateful streams', async () => {
  const p = expect(toArray(streams.forkState('foo'))).resolves
    .toMatchInlineSnapshot(`
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
  const controller = streams.controlState('foo', {
    __INIT__: () => 1,
    inc: (state) => state + 1,
  })
  controller.dispatch('inc')
  controller.close()
  streams.start()
  await p
})

test('writing to a stream with another stream', async () => {
  fromCollection(['a', 'b', 'c', 'd']).pipeTo(streams.write('foo'))

  const p = expect(toArray(streams.fork('foo'))).resolves
    .toMatchInlineSnapshot(`
              [
                "a",
                "b",
                "c",
                "d",
              ]
            `)

  streams.start()
  await p
})
