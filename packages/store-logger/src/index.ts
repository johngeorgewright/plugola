import type { Listener, Store } from '@plugola/store'
import type { Logger } from '@plugola/logger'

export default function storeLogger(
  store: Store<any, any>,
  logger: Logger,
  label = 'store'
) {
  const storeLogger = logger.extend(label)

  const subscription: Listener<any, any> = (action, param, state) => {
    storeLogger.info(action, param, state)
  }

  const staleSubscription: Listener<any, any> = (action, param) => {
    storeLogger.info(action, param, 'NO_CHANGE')
  }

  const unsubscribe = store.subscribe(subscription)
  const staleUnsubscribe = store.subscribeToStaleEvents(staleSubscription)

  return () => {
    unsubscribe()
    staleUnsubscribe()
  }
}
