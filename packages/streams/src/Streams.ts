import { AbortError, defer } from '@johngw/async'
import {
  Controllable,
  ForkableRecallStream,
  ForkableReplayStream,
  StatefulSubject,
  StateReducers,
  Subject,
} from '@johngw/stream'
import { O } from 'ts-toolbelt'

export type StreamDict = {
  subjects: Record<string, unknown>
  recallSubjects: Record<string, unknown>
  replaySubjects: Record<string, unknown>
  statefulSubjects: Record<
    string,
    { actions: Record<string, unknown>; state: unknown }
  >
}

export type CreateStreamDict<D extends Partial<StreamDict>> = O.Merge<
  D,
  {
    subjects: {}
    recallSubjects: {}
    replaySubjects: {}
    statefulSubjects: {}
  }
>

export class Streams<Dict extends StreamDict = CreateStreamDict<{}>> {
  readonly #subjects = {} as Record<keyof Dict['subjects'], Subject<unknown>>

  readonly #recallSubjects = {} as Record<
    keyof Dict['recallSubjects'],
    Subject<unknown>
  >

  readonly #replaySubjects = {} as Record<
    keyof Dict['replaySubjects'],
    Subject<unknown>
  >

  readonly #statefulSubjects = {} as Record<
    keyof Dict['statefulSubjects'],
    StatefulSubject<StateReducers<any, any>, any>
  >

  readonly #untilStart: Promise<void>

  readonly start: () => void

  constructor() {
    const deffered = defer()
    this.#untilStart = deffered.promise
    this.start = deffered.resolve
  }

  fork<Name extends keyof Dict['subjects']>(name: Name) {
    return this.#subject(name).fork()
  }

  forkRecall<Name extends keyof Dict['recallSubjects']>(name: Name) {
    return this.#recallSubject(name).fork()
  }

  forkReplay<Name extends keyof Dict['replaySubjects']>(name: Name) {
    return this.#replaySubject(name).fork()
  }

  async forkState<Name extends keyof Dict['statefulSubjects']>(
    name: Name,
    signal?: AbortSignal
  ) {
    await this.#whenStarted(signal)
    return this.#statefulSubject(name).fork()
  }

  async control<Name extends keyof Dict['subjects']>(
    name: Name,
    signal?: AbortSignal
  ) {
    await this.#whenStarted(signal)
    return this.#subject(name).control()
  }

  async controlRecall<Name extends keyof Dict['recallSubjects']>(
    name: Name,
    signal?: AbortSignal
  ) {
    await this.#whenStarted(signal)
    return this.#recallSubject(name).control()
  }

  controlReplay<Name extends keyof Dict['replaySubjects']>(
    name: Name
  ): Controllable<Dict['replaySubjects'][Name]> {
    return this.#replaySubject(name).control()
  }

  controlState<Name extends keyof Dict['statefulSubjects']>(
    name: Name,
    reducers?: StateReducers<
      Dict['statefulSubjects'][Name]['actions'],
      Dict['statefulSubjects'][Name]['state']
    >
  ) {
    return this.#statefulSubject(
      name,
      reducers && new StatefulSubject(reducers)
    ).control()
  }

  #whenStarted(signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(new AbortError())
      signal?.addEventListener('abort', () => reject(new AbortError()))
      this.#untilStart.then(resolve)
    })
  }

  #subject<Name extends keyof Dict['subjects']>(name: Name) {
    if (!this.#subjects[name]) this.#subjects[name] = new Subject()
    return this.#subjects[name] as Subject<Dict['subjects'][Name]>
  }

  #recallSubject<Name extends keyof Dict['recallSubjects']>(name: Name) {
    if (!this.#recallSubjects[name])
      this.#recallSubjects[name] = new Subject({
        forkable: new ForkableRecallStream(),
      })
    return this.#recallSubjects[name] as Subject<Dict['recallSubjects'][Name]>
  }

  #replaySubject<Name extends keyof Dict['replaySubjects']>(name: Name) {
    if (!this.#replaySubjects[name])
      this.#replaySubjects[name] = new Subject({
        forkable: new ForkableReplayStream(),
      })
    return this.#replaySubjects[name] as Subject<Dict['replaySubjects'][Name]>
  }

  #statefulSubject<Name extends keyof Dict['statefulSubjects']>(
    name: Name,
    subject?: StatefulSubject<
      Dict['statefulSubjects'][Name]['actions'],
      Dict['statefulSubjects'][Name]['state']
    >
  ) {
    if (subject)
      if (this.#statefulSubjects[name])
        throw new Error(
          `Cannot override the stateful subject "${String(name)}"`
        )
      else this.#statefulSubjects[name] = subject
    else if (!this.#statefulSubjects[name])
      throw new Error(
        `No registered stateful subject "${String(
          name
        )}". It must be created with streams.controlState(name, reducers)`
      )
    return this.#statefulSubjects[name] as StatefulSubject<
      Dict['statefulSubjects'][Name]['actions'],
      Dict['statefulSubjects'][Name]['state']
    >
  }
}
