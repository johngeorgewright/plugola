# @johngeorgewright/test

> Test plugola plugins

## Example

```typescript
testPlugin({
  pluginContext(pluginName) {
    return { pluginName }
  },

  testContext() {
    return {
      mung: {},
      $i: new Invokables<{ mung: { args: []; return: unknown } }>(),
    }
  },

  initContext() {
    return {}
  },

  runContext() {
    return {}
  },

  afterRun({ $i }) {
    return $i.start()
  },

  tests: {
    'pluginContext is different for each plugin': [
      // ARRAY OF PLUGINS
      {
        name: 'test',
        run({ pluginName }) {
          expect(pluginName).toBe('test')
        },
      },
      {
        name: 'test 2',
        run({ pluginName }) {
          expect(pluginName).toBe('test 2')
        },
      },
    ],

    'testContext is the same for every plugin': [
      // ARRAY OF PLUGINS
      {
        name: 'test',
        run({ $i, mung }) {
          $i.register('mung', () => mung)
        },
      },
      {
        name: 'test 2',
        async run({ $i, mung }) {
          expect(await $i.invoke('mung')).toBe(mung)
        },
      },
    ],
  },
})
```
