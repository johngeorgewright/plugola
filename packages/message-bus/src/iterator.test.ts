import { timeout } from '@johngw/async'
import { combine } from './iterator'

test('combine', async () => {
  async function* a() {
    for (let i = 0; i < 3; i++) {
      await timeout(1)
      yield i
    }
  }

  async function* b() {
    for (let i = 10; i < 13; i++) {
      await timeout(2)
      yield i
    }
  }

  const results = []

  for await (const result of combine(a(), b())) {
    results.push(result)
  }

  console.info(results)
})
