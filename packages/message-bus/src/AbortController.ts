import { AbortController, AbortSignal } from 'node-abort-controller'

/**
 * Creates a new AbortController and pipes an abort
 * signal into it.
 */
export function fromSignal(abortSignal: AbortSignal) {
  const abortController = new AbortController()

  if (abortSignal.aborted) {
    abortController.abort()
  } else {
    abortSignal.addEventListener('abort', () => abortController.abort())
  }

  return abortController
}

/**
 * Monitor multiple AbortSignals using the same interface as
 * a single AbortSignal
 */
export class AbortSignalComposite {
  #abortSignals: Iterable<AbortSignal>

  private constructor(abortSignals: Iterable<AbortSignal>) {
    this.#abortSignals = abortSignals
  }

  get aborted() {
    for (const { aborted } of this.#abortSignals) {
      if (aborted) return true
    }
    return false
  }

  set onabort(listener: () => any) {
    for (const abortSignal of this.#abortSignals) {
      abortSignal.onabort = listener
    }
  }

  dispatchEvent: AbortSignal['dispatchEvent'] = (...args) => {
    let result = true
    for (const abortSignal of this.#abortSignals) {
      result = abortSignal.dispatchEvent(...args) && result
    }
    return result
  }

  addEventListener: AbortSignal['addEventListener'] = (...args) => {
    for (const abortSignal of this.#abortSignals) {
      abortSignal.addEventListener(...args)
    }
  }

  removeEventListener: AbortSignal['removeEventListener'] = (...args) => {
    for (const abortSignal of this.#abortSignals) {
      abortSignal.removeEventListener(...args)
    }
  }

  onAbort(fn: () => any) {
    this.addEventListener('abort', fn)
  }

  static create(...abortSignals: Array<AbortSignal | undefined>) {
    return new AbortSignalComposite(
      new Set(abortSignals.filter((x): x is AbortSignal => !!x))
    )
  }
}
