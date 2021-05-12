import LoggerBehavior from './LoggerBehavior'

const disabledLoggerBehavior: LoggerBehavior = () => {}
export default disabledLoggerBehavior

disabledLoggerBehavior.debug = () => {}
disabledLoggerBehavior.error = () => {}
disabledLoggerBehavior.info = () => {}
disabledLoggerBehavior.log = () => {}
disabledLoggerBehavior.table = () => {}
disabledLoggerBehavior.warn = () => {}
