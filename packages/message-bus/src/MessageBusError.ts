export default class MessageBusError extends Error {
  constructor(
    public readonly brokerId: string,
    public readonly originalError: Error
  ) {
    super(`${brokerId}: ${originalError.message}`)
  }
}
