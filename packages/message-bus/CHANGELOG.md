# Changelog

## 1.0.0 (2025-09-23)


### ⚠ BREAKING CHANGES

* dropping support for Node<22
* Now requires ESM and some exports have changed.
* **message-bus:** Broker.interceptInvoker has a different function signature.
* drop support for nodev12

### Features

* **invoke:** add invoke package ([afce0f5](https://github.com/johngeorgewright/plugola/commit/afce0f543ea529681e29b70e5c6c4a09b190e275))
* **message-bus:** intercepting invokable returns ([233bbd2](https://github.com/johngeorgewright/plugola/commit/233bbd23a427f1f4b6b86279f98f0c369c56d18f))
* not registered error ([80fe9f6](https://github.com/johngeorgewright/plugola/commit/80fe9f6be51344a365a3ad4a51a595434a0c22c7))


### Bug Fixes

* **deps:** update dependency @johngw/async to v5.0.1 ([7244442](https://github.com/johngeorgewright/plugola/commit/7244442723fa72c8b21f1a39943fe46f978c8ea4))
* **deps:** update dependency @johngw/async-iterator to v4.0.1 ([7a99e9a](https://github.com/johngeorgewright/plugola/commit/7a99e9aeef2662658179a937481152dfc1ad8292))
* **deps:** update dependency tslib to v2.6.0 ([72ce080](https://github.com/johngeorgewright/plugola/commit/72ce0804818a02039194db1f797a67f9e0e32a07))
* **deps:** update dependency tslib to v2.6.1 ([c419ef0](https://github.com/johngeorgewright/plugola/commit/c419ef098372ad16cae874bef7853ea842b33a3f))
* **deps:** update dependency tslib to v2.6.2 ([d120ee1](https://github.com/johngeorgewright/plugola/commit/d120ee14d89427257cdec8e0afa97c5741d4dc49))
* **message-bus:** remove dom lib ([5d70b14](https://github.com/johngeorgewright/plugola/commit/5d70b144a290210ffd979e094e89b2175e745da5))
* private constructor to a'public constructor ([db695f1](https://github.com/johngeorgewright/plugola/commit/db695f13ef332170809e6eb30107e04bbdea5716))


### Miscellaneous Chores

* convert project to esm ([65ed81a](https://github.com/johngeorgewright/plugola/commit/65ed81acf0c34754770986af71bfe1cbb07f3690))
* upgrade all dependencies ([7ac634e](https://github.com/johngeorgewright/plugola/commit/7ac634e6517a36be84e441878834cf36eea1fe52))


### Continuous Integration

* copy over ts-mono-repo ci template ([2e2c055](https://github.com/johngeorgewright/plugola/commit/2e2c055b72965a8f05728ed2dc91e738a1ce775e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @plugola/invoke bumped to 1.0.0
