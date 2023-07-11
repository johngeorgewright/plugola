export class InvokableRegisteredError extends Error {
  constructor(invokableName: string, args: unknown[]) {
    super(
      `An invoker has already been registered that matches ${invokableName.toString()} with args: ${args.join(
        ', '
      )}.`
    )
  }
}
