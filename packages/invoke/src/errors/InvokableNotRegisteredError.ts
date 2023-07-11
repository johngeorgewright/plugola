export class InvokableNotRegisteredError extends Error {
  #invokableName: string

  constructor(invokableName: string) {
    super(`Cannot find matching invoker for "${invokableName}".`)
    this.#invokableName = invokableName
  }

  get invokableName() {
    return this.#invokableName
  }
}
