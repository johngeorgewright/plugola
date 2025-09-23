# Changelog

## [9.0.0](https://github.com/johngeorgewright/plugola/compare/store-v8.0.0...store-v9.0.0) (2025-09-23)


### ⚠ BREAKING CHANGES

* dropping support for Node<22
* Now requires ESM and some exports have changed.
* **store:** you now initialise the store's state by implementing a `__init__` function in your actions. The `init()` method has also been removed.
* drop support for nodev12

### Features

* **store:** add action specific listeners ([b69aabf](https://github.com/johngeorgewright/plugola/commit/b69aabf68de2bfc404981a6b100e4480f7eef5c2))


### Bug Fixes

* **deps:** update dependency tslib to v2.6.0 ([72ce080](https://github.com/johngeorgewright/plugola/commit/72ce0804818a02039194db1f797a67f9e0e32a07))
* **deps:** update dependency tslib to v2.6.1 ([c419ef0](https://github.com/johngeorgewright/plugola/commit/c419ef098372ad16cae874bef7853ea842b33a3f))
* **deps:** update dependency tslib to v2.6.2 ([d120ee1](https://github.com/johngeorgewright/plugola/commit/d120ee14d89427257cdec8e0afa97c5741d4dc49))


### Miscellaneous Chores

* convert project to esm ([65ed81a](https://github.com/johngeorgewright/plugola/commit/65ed81acf0c34754770986af71bfe1cbb07f3690))
* upgrade all dependencies ([7ac634e](https://github.com/johngeorgewright/plugola/commit/7ac634e6517a36be84e441878834cf36eea1fe52))


### Code Refactoring

* **store:** initialising with a function ([71b752b](https://github.com/johngeorgewright/plugola/commit/71b752b1f12ac882874044c560c595895c5ac751))


### Continuous Integration

* copy over ts-mono-repo ci template ([2e2c055](https://github.com/johngeorgewright/plugola/commit/2e2c055b72965a8f05728ed2dc91e738a1ce775e))
