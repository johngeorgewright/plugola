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

export class AbortSignalReasonComposite extends Error {
  #reasons: any[]

  constructor(reasons: any[]) {
    super('AbortSignalReasonComposite')
    this.#reasons = reasons
  }

  get reasons() {
    return this.#reasons
  }
}

/**
 * Monitor multiple AbortSignals using the same interface as
 * a single AbortSignal
 */
export class AbortSignalComposite implements AbortSignal {
  #abortSignals: Iterable<AbortSignal>

  constructor(abortSignals: Iterable<AbortSignal>) {
    this.#abortSignals = abortSignals
  }

  get aborted() {
    for (const { aborted } of this.#abortSignals) if (aborted) return true
    return false
  }

  get reason() {
    const reasons: any[] = []

    for (const { aborted, reason } of this.#abortSignals)
      if (aborted) reasons.push(reason)

    return new AbortSignalReasonComposite(reasons)
  }

  set onabort(listener: () => any) {
    for (const abortSignal of this.#abortSignals) abortSignal.onabort = listener
  }

  dispatchEvent: AbortSignal['dispatchEvent'] = (...args) => {
    let result = true
    for (const abortSignal of this.#abortSignals)
      result = abortSignal.dispatchEvent(...args) && result
    return result
  }

  addEventListener: AbortSignal['addEventListener'] = (...args: any[]) => {
    for (const abortSignal of this.#abortSignals) {
      // @ts-expect-error A spread argument must either have a tuple type or be passed to a rest parameter.
      abortSignal.addEventListener(...args)
    }
  }

  removeEventListener: AbortSignal['removeEventListener'] = (
    ...args: any[]
  ) => {
    for (const abortSignal of this.#abortSignals) {
      // @ts-expect-error A spread argument must either have a tuple type or be passed to a rest parameter.
      abortSignal.removeEventListener(...args)
    }
  }

  onAbort(fn: () => any) {
    this.addEventListener('abort', fn)
  }

  throwIfAborted(): void {
    if (this.aborted) throw this.reason
  }

  static create(...abortSignals: Array<AbortSignal | undefined>) {
    return new AbortSignalComposite(new Set(abortSignals.filter((x) => !!x)))
  }
}
