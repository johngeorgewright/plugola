import { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
  setupFilesAfterEnv: [require.resolve('@johngw/stream-test/polyfill')],
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'test/tsconfig.json' }],
  },
}

export default config
