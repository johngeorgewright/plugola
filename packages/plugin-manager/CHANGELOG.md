# Changelog

## [8.0.1](https://github.com/johngeorgewright/plugola/compare/plugin-manager-v8.0.0...plugin-manager-v8.0.1) (2025-10-30)


### Bug Fixes

* **deps:** update dependency rimraf to v6.1.0 ([#763](https://github.com/johngeorgewright/plugola/issues/763)) ([b3a3c57](https://github.com/johngeorgewright/plugola/commit/b3a3c57ad0a0addbbe9e86a6eadb3433fd81dfa7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @plugola/graph bumped to 3.0.1

## [8.0.0](https://github.com/johngeorgewright/plugola/compare/plugin-manager-v7.0.0...plugin-manager-v8.0.0) (2025-10-03)


### ⚠ BREAKING CHANGES

* The `init` phase has been renamed to `enable`.

### Features

* introduce optional dependencies ([1e04612](https://github.com/johngeorgewright/plugola/commit/1e046125b87524981cf94d9bc6b586bf16f63d93))
* only enable one level of dependencies at once ([e9e5f99](https://github.com/johngeorgewright/plugola/commit/e9e5f997b4ca7037d43c59c277735e0f2abe3a61))


### Code Refactoring

* init phase to enable phase ([1e04612](https://github.com/johngeorgewright/plugola/commit/1e046125b87524981cf94d9bc6b586bf16f63d93))
