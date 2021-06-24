import type { Store } from '@plugola/store'
import type { Logger } from '@plugola/logger'

export default function storeLogger(
  store: Store<any, any>,
  logger: Logger,
  label = 'store'
) {
  const storeLogger = logger.extend(label)

  store.subscribe((action, state) => {
    storeLogger.info(action, state)
  })

  store.subscribeToStaleEvents((action) => {
    storeLogger.info(action, 'NO_CHANGE')
  })
}
