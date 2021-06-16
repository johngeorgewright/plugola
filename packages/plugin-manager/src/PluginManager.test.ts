import { MessageBus } from '@plugola/message-bus'
import PluginManager from './PluginManager'
import { timeout } from '@johngw/async'

type Events = { foo: [string] }

let messageBus: MessageBus<Events>
let pluginManager: PluginManager<typeof messageBus>

beforeEach(() => {
  messageBus = new MessageBus()
  messageBus.start()
  pluginManager = new PluginManager(messageBus) as any
})

test('initializing plugins', async () => {
  let result: string

  pluginManager.registerPlugin({
    name: 'mung',
    init() {
      result = 'initializing mung'
    },
  })

  await pluginManager.enableAllPlugins()
  expect(result!).toBe('initializing mung')
})

test('initialize dependency tree', async () => {
  let result: string = ''

  pluginManager.registerPlugin({
    name: 'foo',
    init() {
      result += 'foo'
    },
  })

  pluginManager.registerPlugin({
    name: 'bar',
    dependencies: ['foo'],
    init() {
      result += 'bar'
    },
  })

  pluginManager.registerPlugin({
    name: 'mung',
    dependencies: ['bar', 'foo'],
    init() {
      result += 'mung'
    },
  })

  await pluginManager.enablePlugins(['mung'])
  expect(result!).toBe('foobarmung')
})

test('running normal plugins', async () => {
  let result: string

  pluginManager.registerPlugin({
    name: 'mung',
    run() {
      result = 'running mung'
    },
  })

  await pluginManager.enableAllPlugins()
  await pluginManager.run()
  expect(result!).toBe('running mung')
})

test('running stateful plugins', async () => {
  let result: string

  pluginManager.registerStatefulPlugin<{ type: 'foo' }, 'foo' | 'bar'>({
    name: 'foo',
    state: {
      initial: 'bar',

      reduce(action, state) {
        switch (action.type) {
          case 'foo':
            return 'foo'
          default:
            return state
        }
      },

      onUpdate(state) {
        console.info(state)
      },
    },

    run({ store }) {
      expect(store.state).toBe('bar')
      store.dispatch({ type: 'foo' })
      result = store.state
    },
  })

  await pluginManager.enableAllPlugins()
  await pluginManager.run()
  expect(result!).toBe('foo')
})

test('running with a dependency tree', async () => {
  let result: string = ''

  pluginManager.registerPlugin({
    name: 'foo',
    run() {
      result += 'foo'
    },
  })

  pluginManager.registerPlugin({
    name: 'bar',
    dependencies: ['foo'],
    run() {
      result += 'bar'
    },
  })

  pluginManager.registerPlugin({
    name: 'mung',
    dependencies: ['bar', 'foo'],
    run() {
      result += 'mung'
    },
  })

  await pluginManager.enablePlugins(['mung'])
  await pluginManager.run()
  expect(result!).toBe('foobarmung')
})

test('using the message bus to communicate between plugins', (done) => {
  pluginManager.registerPlugin({
    name: 'foo',
    run({ broker }) {
      broker.on('foo', (str) => {
        expect(str).toBe('bar')
        done()
      })
    },
  })

  pluginManager.registerPlugin({
    name: 'bar',
    run({ broker }) {
      broker.emit('foo', 'bar')
    },
  })

  pluginManager.enableAllPlugins().then(() => pluginManager.run())
})

test('extra context', async () => {
  const pluginManager = new PluginManager(messageBus, {
    addContext(pluginName) {
      return {
        foo: pluginName,
      }
    },

    addInitContext() {
      return {
        bar: 'bar',
      }
    },

    addRunContext() {
      return {
        mung: 'face',
      }
    },
  })

  pluginManager.registerPlugin({
    name: 'my-plugin',
    init({ foo, bar }) {
      expect(foo).toBe('my-plugin')
      expect(bar).toBe('bar')
    },

    run({ foo, mung }) {
      expect(foo).toBe('my-plugin')
      expect(mung).toBe('face')
    },
  })

  await pluginManager.enableAllPlugins()
  await pluginManager.run()
})

test('only run enabled plugins', async () => {
  const foo = jest.fn()
  const bar = jest.fn()

  pluginManager.registerPlugin({
    name: 'foo',
    run: foo,
  })

  pluginManager.registerPlugin({
    name: 'bar',
    run: bar,
  })

  await pluginManager.enablePlugins(['foo'])
  await pluginManager.run()

  expect(foo).toHaveBeenCalled()
  expect(bar).not.toHaveBeenCalled()
})

test('enabling plugins within the init phase', async () => {
  const foo = jest.fn()
  const bar = jest.fn()

  pluginManager.registerPlugin({
    name: 'foo',
    init({ enablePlugins }) {
      enablePlugins(['bar'])
    },
    run: foo,
  })

  pluginManager.registerPlugin({
    name: 'bar',
    run: bar,
  })

  await pluginManager.enablePlugins(['foo'])

  await pluginManager.run()

  expect(foo).toHaveBeenCalled()
  expect(bar).toHaveBeenCalled()
})

test('disabling plugins within the init phase', async () => {
  const foo = jest.fn()
  const bar = jest.fn()

  pluginManager.registerPlugin({
    name: 'bar',
    run: bar,
  })

  pluginManager.registerPlugin({
    name: 'foo',
    init({ disablePlugins }) {
      disablePlugins(['bar'])
    },
    run: foo,
  })

  await pluginManager.enablePlugins(['foo', 'bar'])
  await pluginManager.run()

  expect(foo).toHaveBeenCalled()
  expect(bar).not.toHaveBeenCalled()
})

test('cleaning up plugins when disabled in the init phase', async () => {
  const foo = jest.fn()
  const bar = jest.fn()
  const abort = jest.fn()

  pluginManager.registerPlugin({
    name: 'foo',
    async init({ disablePlugins, signal }) {
      await timeout(10, signal)
      disablePlugins(['bar'])
    },
    run: foo,
  })

  pluginManager.registerPlugin({
    name: 'bar',
    init({ signal }) {
      signal.addEventListener('abort', abort)
    },
    run: bar,
  })

  await pluginManager.enablePlugins(['bar', 'foo'])
  await pluginManager.run()

  expect(foo).toHaveBeenCalled()
  expect(abort).toHaveBeenCalled()
  expect(bar).not.toHaveBeenCalled()
})

test('plugins that time out', async () => {
  const abort = jest.fn<void, [string]>()

  pluginManager = new PluginManager(messageBus, { pluginTimeout: 100 }) as any

  pluginManager.registerPlugin({
    name: 'foo',
    async init({ signal }) {
      signal.addEventListener('abort', () => abort('init'))
    },
    async run({ signal }) {
      signal.addEventListener('abort', () => abort('run'))
      await timeout(500, signal)
    },
  })

  await pluginManager.enableAllPlugins()
  await pluginManager.run()

  expect(abort).toHaveBeenCalledTimes(2)
  expect(abort).toHaveBeenCalledWith('init')
  expect(abort).toHaveBeenCalledWith('run')
})
