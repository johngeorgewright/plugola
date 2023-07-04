import { defer } from '@johngw/async'
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

  readonly #whenRunning: Promise<void>

  readonly start: () => void

  constructor() {
    const deffered = defer()
    this.#whenRunning = deffered.promise
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

  async forkState<Name extends keyof Dict['statefulSubjects']>(name: Name) {
    await this.#whenRunning
    return this.#statefulSubject(name).fork()
  }

  async control<Name extends keyof Dict['subjects']>(name: Name) {
    await this.#whenRunning
    return this.#subject(name).control()
  }

  async controlRecall<Name extends keyof Dict['recallSubjects']>(name: Name) {
    await this.#whenRunning
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
    if (reducers) {
      if (this.#statefulSubjects[name])
        throw new Error(
          `Cannot override the stateful subject "${String(name)}"`
        )
      this.#statefulSubjects[name] = new StatefulSubject(reducers)
    }
    return this.#statefulSubject(name).control()
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

  #statefulSubject<Name extends keyof Dict['statefulSubjects']>(name: Name) {
    if (!this.#statefulSubjects[name])
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
