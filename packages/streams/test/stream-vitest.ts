import { expectTimeline as $expectTimeline } from '@johngw/stream-test'
import { expect } from 'vitest'

export { fromTimeline } from '@johngw/stream-test'

export function expectTimeline(timeline: string) {
  return $expectTimeline(timeline, (timelineValue, chunk) => {
    expect(chunk).toStrictEqual(timelineValue)
  })
}
