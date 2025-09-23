# Changelog

## [5.0.0](https://github.com/johngeorgewright/plugola/compare/vendor-plugin-manager-v4.0.0...vendor-plugin-manager-v5.0.0) (2025-09-23)


### ⚠ BREAKING CHANGES

* dropping support for Node<22
* Now requires ESM and some exports have changed.
* plugin.init() is now .enable()
* **plugin-manager:** PluginManager no longer excepts a message bus
* drop support for nodev12

### Features

* not registered error ([80fe9f6](https://github.com/johngeorgewright/plugola/commit/80fe9f6be51344a365a3ad4a51a595434a0c22c7))
* **vendor-plugin-manager:** new register format ([ad9b127](https://github.com/johngeorgewright/plugola/commit/ad9b127fff03e165ec31e42f2015ee609eb877c7))


### Bug Fixes

* **deps:** update dependency @johngw/map to v1.3.1 ([e650b12](https://github.com/johngeorgewright/plugola/commit/e650b1296e6ca92a0af010cf84dc67830cb585fa))
* **deps:** update dependency @johngw/map to v1.3.2 ([862f909](https://github.com/johngeorgewright/plugola/commit/862f90947b22264dfd3e2d425c5453d70fbf345b))
* **deps:** update dependency tslib to v2.4.1 ([cb0e525](https://github.com/johngeorgewright/plugola/commit/cb0e525a0525b6de1d4b77cb36ce917ab0e7efc1))
* **deps:** update dependency tslib to v2.5.0 ([4cbc57d](https://github.com/johngeorgewright/plugola/commit/4cbc57d0b9a201925115d766f7661dd825202ea7))
* **deps:** update dependency tslib to v2.5.1 ([7ba7146](https://github.com/johngeorgewright/plugola/commit/7ba7146c5ea8f258c84b72e13fd9e275865dfee0))
* **deps:** update dependency tslib to v2.6.0 ([72ce080](https://github.com/johngeorgewright/plugola/commit/72ce0804818a02039194db1f797a67f9e0e32a07))
* **deps:** update dependency tslib to v2.6.1 ([c419ef0](https://github.com/johngeorgewright/plugola/commit/c419ef098372ad16cae874bef7853ea842b33a3f))
* **deps:** update dependency tslib to v2.6.2 ([d120ee1](https://github.com/johngeorgewright/plugola/commit/d120ee14d89427257cdec8e0afa97c5741d4dc49))


### Miscellaneous Chores

* convert project to esm ([65ed81a](https://github.com/johngeorgewright/plugola/commit/65ed81acf0c34754770986af71bfe1cbb07f3690))
* upgrade all dependencies ([7ac634e](https://github.com/johngeorgewright/plugola/commit/7ac634e6517a36be84e441878834cf36eea1fe52))


### Code Refactoring

* **plugin-manager:** remove messagebus dep ([3825c51](https://github.com/johngeorgewright/plugola/commit/3825c514a5203ae4eb65d087a5e34a788b076555))
* renaming init to enable ([34f1291](https://github.com/johngeorgewright/plugola/commit/34f129158946c9f739427cc1cca767ab0e4606a0))


### Continuous Integration

* copy over ts-mono-repo ci template ([2e2c055](https://github.com/johngeorgewright/plugola/commit/2e2c055b72965a8f05728ed2dc91e738a1ce775e))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @plugola/plugin-manager bumped to 8.0.0
  * peerDependencies
    * @plugola/plugin-manager bumped from ^5.3.0 to ^8.0.0
