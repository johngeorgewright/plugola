# Changelog

## [8.0.0](https://github.com/johngeorgewright/plugola/compare/plugin-manager-v7.0.0...plugin-manager-v8.0.0) (2025-09-23)


### ⚠ BREAKING CHANGES

* dropping support for Node<22
* Now requires ESM and some exports have changed.
* plugin.init() is now .enable()
* plugin.init() is now .enable()
* **plugin-manager:** PluginManager no longer excepts a message bus
* drop support for nodev12

### Features

* not registered error ([80fe9f6](https://github.com/johngeorgewright/plugola/commit/80fe9f6be51344a365a3ad4a51a595434a0c22c7))
* **plugin-manager:** force disable plugins ([0be21ee](https://github.com/johngeorgewright/plugola/commit/0be21ee4ae1f58a6a6b546f356668aca51adb325))
* **plugin-manager:** force disable plugins ([22268fe](https://github.com/johngeorgewright/plugola/commit/22268fece545f7e417668c37c1ed68b60c9de092))
* **test:** add test package ([12c1ddb](https://github.com/johngeorgewright/plugola/commit/12c1ddb8d7c52cb42804953cb476e74f4d3d8246))


### Bug Fixes

* **deps:** update dependency @johngw/async to v5.0.1 ([7244442](https://github.com/johngeorgewright/plugola/commit/7244442723fa72c8b21f1a39943fe46f978c8ea4))
* **deps:** update dependency tslib to v2.6.0 ([72ce080](https://github.com/johngeorgewright/plugola/commit/72ce0804818a02039194db1f797a67f9e0e32a07))
* **deps:** update dependency tslib to v2.6.1 ([c419ef0](https://github.com/johngeorgewright/plugola/commit/c419ef098372ad16cae874bef7853ea842b33a3f))
* **deps:** update dependency tslib to v2.6.2 ([d120ee1](https://github.com/johngeorgewright/plugola/commit/d120ee14d89427257cdec8e0afa97c5741d4dc49))
* duplicate plugin inits ([933f260](https://github.com/johngeorgewright/plugola/commit/933f2600a63c9d888d454aa347604e2a152ec37b))
* never force disable dependencies ([a4f453d](https://github.com/johngeorgewright/plugola/commit/a4f453d84a5a87a4e7f592f7cfb55bd943e0bca5))


### Miscellaneous Chores

* convert project to esm ([65ed81a](https://github.com/johngeorgewright/plugola/commit/65ed81acf0c34754770986af71bfe1cbb07f3690))
* upgrade all dependencies ([7ac634e](https://github.com/johngeorgewright/plugola/commit/7ac634e6517a36be84e441878834cf36eea1fe52))


### Code Refactoring

* **plugin-manager:** remove messagebus dep ([3825c51](https://github.com/johngeorgewright/plugola/commit/3825c514a5203ae4eb65d087a5e34a788b076555))
* renaming init to enable ([aa558b4](https://github.com/johngeorgewright/plugola/commit/aa558b475cf1f914d65392c952a114855af35d6a))
* renaming init to enable ([34f1291](https://github.com/johngeorgewright/plugola/commit/34f129158946c9f739427cc1cca767ab0e4606a0))


### Continuous Integration

* copy over ts-mono-repo ci template ([2e2c055](https://github.com/johngeorgewright/plugola/commit/2e2c055b72965a8f05728ed2dc91e738a1ce775e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @plugola/graph bumped to 4.0.0
