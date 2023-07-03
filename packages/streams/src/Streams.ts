import { defer } from '@johngw/async'
import {
  Controllable,
  ForkableRecallStream,
  ForkableReplayStream,
  StatefulSubject,
  StateReducerOutput,
  StateReducers,
  Subject,
} from '@johngw/stream'

export class Streams<
  Subjects extends Record<string, unknown> = {},
  RecallSubjects extends Record<string, unknown> = {},
  ReplaySubjects extends Record<string, unknown> = {},
  StatefulSubjects extends Record<
    string,
    { actions: Record<string, unknown>; state: unknown }
  > = {}
> {
  readonly #subjects = {} as Record<keyof Subjects, Subject<unknown>>

  readonly #recallSubjects = {} as Record<
    keyof RecallSubjects,
    Subject<unknown>
  >

  readonly #replaySubjects = {} as Record<
    keyof ReplaySubjects,
    Subject<unknown>
  >

  readonly #statefulSubjects = {} as Record<
    keyof StatefulSubjects,
    StatefulSubject<StateReducers<any, any>, any>
  >

  readonly #whenRunning: Promise<void>

  readonly start: () => void

  constructor() {
    const deffered = defer()
    this.#whenRunning = deffered.promise
    this.start = deffered.resolve
  }

  fork<Name extends keyof Subjects>(name: Name) {
    return this.#subject(name).fork()
  }

  forkRecall<Name extends keyof RecallSubjects>(name: Name) {
    return this.#recallSubject(name).fork()
  }

  forkReplay<Name extends keyof ReplaySubjects>(name: Name) {
    return this.#replaySubject(name).fork()
  }

  forkState<Name extends keyof StatefulSubjects>(
    name: Name,
    cb: (
      stream: ReadableStream<
        StateReducerOutput<
          StatefulSubjects[Name]['actions'],
          StatefulSubjects[Name]['state']
        >
      >
    ) => any
  ) {
    this.#whenRunning.then(() => {
      if (!this.#statefulSubjects[name])
        throw new Error(`No stateful subject "${String(name)}".`)
      cb(
        this.#statefulSubjects[name].fork() as ReadableStream<
          StateReducerOutput<
            StatefulSubjects[Name]['actions'],
            StatefulSubjects[Name]['state']
          >
        >
      )
    })
  }

  control<Name extends keyof Subjects>(
    name: Name,
    cb: (controller: Controllable<Subjects[Name]>) => any
  ) {
    this.#whenRunning.then(() => cb(this.#subject(name).control()))
  }

  controlRecall<Name extends keyof RecallSubjects>(
    name: Name,
    cb: (controller: Controllable<RecallSubjects[Name]>) => any
  ) {
    this.#whenRunning.then(() => {
      cb(this.#recallSubject(name).control())
    })
  }

  controlReplay<Name extends keyof ReplaySubjects>(
    name: Name
  ): Controllable<ReplaySubjects[Name]> {
    return this.#replaySubject(name).control()
  }

  controlState<Name extends keyof StatefulSubjects>(
    name: Name,
    reducers: StateReducers<
      StatefulSubjects[Name]['actions'],
      StatefulSubjects[Name]['state']
    >
  ) {
    if (this.#statefulSubjects[name])
      throw new Error(`Cannot override the stateful subject "${String(name)}"`)
    this.#statefulSubjects[name] = new StatefulSubject(reducers)
    return (
      this.#statefulSubjects[name] as StatefulSubject<
        StatefulSubjects[Name]['actions'],
        StatefulSubjects[Name]['state']
      >
    ).control()
  }

  #subject<Name extends keyof Subjects>(name: Name) {
    if (!this.#subjects[name]) this.#subjects[name] = new Subject()
    return this.#subjects[name] as Subject<Subjects[Name]>
  }

  #recallSubject<Name extends keyof RecallSubjects>(name: Name) {
    if (!this.#recallSubjects[name])
      this.#recallSubjects[name] = new Subject({
        forkable: new ForkableRecallStream(),
      })
    return this.#recallSubjects[name] as Subject<RecallSubjects[Name]>
  }

  #replaySubject<Name extends keyof ReplaySubjects>(name: Name) {
    if (!this.#replaySubjects[name])
      this.#replaySubjects[name] = new Subject({
        forkable: new ForkableReplayStream(),
      })
    return this.#replaySubjects[name] as Subject<ReplaySubjects[Name]>
  }
}
