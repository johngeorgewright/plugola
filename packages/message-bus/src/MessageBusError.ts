import { Stringable } from './types/util'

export default class MessageBusError extends Error {
  constructor(
    public readonly brokerId: string,
    public readonly eventName: Stringable,
    public readonly originalError: Error
  ) {
    super(`${brokerId}[${eventName}]: ${originalError.message}`)
  }
}
