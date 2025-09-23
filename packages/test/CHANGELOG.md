# Changelog

## [3.0.0](https://github.com/johngeorgewright/plugola/compare/test-v2.0.0...test-v3.0.0) (2025-09-23)


### ⚠ BREAKING CHANGES

* dropping support for Node<22
* Now requires ESM and some exports have changed.
* plugin.init() is now .enable()
* plugin.init() is now .enable()

### Features

* **test:** add test package ([12c1ddb](https://github.com/johngeorgewright/plugola/commit/12c1ddb8d7c52cb42804953cb476e74f4d3d8246))


### Miscellaneous Chores

* convert project to esm ([65ed81a](https://github.com/johngeorgewright/plugola/commit/65ed81acf0c34754770986af71bfe1cbb07f3690))
* upgrade all dependencies ([7ac634e](https://github.com/johngeorgewright/plugola/commit/7ac634e6517a36be84e441878834cf36eea1fe52))


### Code Refactoring

* renaming init to enable ([aa558b4](https://github.com/johngeorgewright/plugola/commit/aa558b475cf1f914d65392c952a114855af35d6a))
* renaming init to enable ([34f1291](https://github.com/johngeorgewright/plugola/commit/34f129158946c9f739427cc1cca767ab0e4606a0))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @plugola/invoke bumped to 3.0.0
    * @plugola/plugin-manager bumped to 8.0.0
  * peerDependencies
    * @plugola/plugin-manager bumped from ^5.2.0 to ^8.0.0
