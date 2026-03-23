/**
 * Creates a new AbortController and pipes an abort
 * signal into it.
 */
export function fromSignal(abortSignal: AbortSignal) {
  const abortController = new AbortController()

  if (abortSignal.aborted) {
    abortController.abort()
  } else {
    abortSignal.addEventListener('abort', () => abortController.abort(), {
      once: true,
    })
  }

  return abortController
}

/**
 * Monitor multiple AbortSignals using the same interface as
 * a single AbortSignal
 */
export function anySignal(...abortSignals: Array<AbortSignal | undefined>) {
  return AbortSignal.any(abortSignals.filter((x) => !!x))
}
