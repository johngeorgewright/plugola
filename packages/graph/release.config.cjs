// @ts-check

/**
 * @type {import('semantic-release').Options}
 */
module.exports = {
  extends: ['../../release.config.cjs', require.resolve('semantic-release-monorepo')],
}
