import PluginManager from '../src/PluginManager'
import { timeout } from '@johngw/async'

let pluginManager: PluginManager<{}, {}, {}>

beforeEach(() => {
  pluginManager = new PluginManager() as any
})

test('initializing plugins', async () => {
  let result: string

  pluginManager.registerPlugin('mung', {
    init() {
      result = 'initializing mung'
    },
  })

  await pluginManager.enableAllPlugins()
  expect(result!).toBe('initializing mung')
})

test('initialize dependency tree', async () => {
  let result: string = ''

  pluginManager.registerPlugin('foo', {
    init() {
      result += 'foo'
    },
  })

  pluginManager.registerPlugin('bar', {
    dependencies: ['foo'],
    init() {
      result += 'bar'
    },
  })

  pluginManager.registerPlugin('mung', {
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

  pluginManager.registerPlugin('mung', {
    run() {
      result = 'running mung'
    },
  })

  await pluginManager.enableAllPlugins()
  await pluginManager.run()
  expect(result!).toBe('running mung')
})

test('running with a dependency tree', async () => {
  let result: string = ''

  pluginManager.registerPlugin('foo', {
    run() {
      result += 'foo'
    },
  })

  pluginManager.registerPlugin('bar', {
    dependencies: ['foo'],
    run() {
      result += 'bar'
    },
  })

  pluginManager.registerPlugin('mung', {
    dependencies: ['bar', 'foo'],
    run() {
      result += 'mung'
    },
  })

  await pluginManager.enablePlugins(['mung'])
  await pluginManager.run()
  expect(result!).toBe('foobarmung')
})

test('extra context', async () => {
  const pluginManager = new PluginManager({
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

  pluginManager.registerPlugin('my-plugin', {
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

  pluginManager.registerPlugin('foo', {
    run: foo,
  })

  pluginManager.registerPlugin('bar', {
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

  pluginManager.registerPlugin('foo', {
    init({ enablePlugins }) {
      enablePlugins(['bar'])
    },
    run: foo,
  })

  pluginManager.registerPlugin('bar', {
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

  pluginManager.registerPlugin('bar', {
    run: bar,
  })

  pluginManager.registerPlugin('foo', {
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

  pluginManager.registerPlugin('foo', {
    async init({ disablePlugins, signal }) {
      await timeout(10, signal)
      expect(disablePlugins(['bar'])).toEqual(1)
    },
    run: foo,
  })

  pluginManager.registerPlugin('bar', {
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

  pluginManager = new PluginManager({ pluginTimeout: 100 })

  pluginManager.registerPlugin('foo', {
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

test('replacing context', async () => {
  const run = jest.fn()

  const pluginManager = new PluginManager({
    addContext: () => ({ foo: 'bar' }),
  })

  pluginManager.registerPlugin('fooinizer', {
    run,
  })

  const pluginManagerTest = pluginManager.withOptions({
    addContext: () => ({ foo: 'rab' }),
  })

  await pluginManagerTest.enableAllPlugins()
  await pluginManagerTest.run()
  expect(run).toHaveBeenCalledTimes(1)
  expect(run.mock.calls[0][0].foo).toBe('rab')
})
