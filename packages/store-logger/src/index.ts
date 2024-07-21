import type { Store } from '@plugola/store'
import type { Logger } from '@plugola/logger'

export default function storeLogger(
  store: Store<any, any>,
  logger: Logger,
  label = 'store'
) {
  const storeLogger = logger.extend(label)

  const unsubscribe = store.subscribe((action, param, state) => {
    storeLogger.info(action, param, state)
  })

  const staleUnsubscribe = store.subscribeToStaleEvents((action, param) => {
    storeLogger.info(action, param, 'NO_CHANGE')
  })

  return () => {
    unsubscribe()
    staleUnsubscribe()
  }
}
