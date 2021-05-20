export async function* combine<T>(...asyncIterables: AsyncIterable<T>[]) {
  const asyncIterators = asyncIterables.map((o) => o[Symbol.asyncIterator]())
  const results = Array(asyncIterables.length)

  try {
    for (
      let nextPromises = asyncIterators.map(getNext);
      nextPromises.length > 0;

    ) {
      const { index, result } = await Promise.race(nextPromises)

      if (result.done) {
        nextPromises[index] = never
        results[index] = result.value
      } else {
        nextPromises[index] = getNext(asyncIterators[index], index)
        yield result.value
      }
    }
  } finally {
    for (const iterator of asyncIterators) {
      if (iterator.return) {
        iterator.return()
      }
    }
  }

  return results

  async function getNext<T>(asyncIterator: AsyncIterator<T>, index: number) {
    return asyncIterator.next().then((result) => ({
      index,
      result,
    }))
  }
}
