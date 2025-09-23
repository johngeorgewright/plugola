import Generator from 'yeoman-generator'
import { kebabCase } from 'change-case'
import { validateGenerationFromRoot } from '../validation.ts'
import * as path from 'path'
import prettier from 'prettier'
import { writeFile } from 'fs/promises'

export default class PackageGenerator extends Generator {
  #namespace = '@plugola'
  #vsCodeWS = 'plugola.code-workspace'
  #answers: { description?: string; name?: string; public?: boolean } = {}

  constructor(args: string | string[], opts: Record<string, unknown>) {
    super(args, opts)
  }

  initializing() {
    validateGenerationFromRoot(this)
  }

  get #relativeDestinationRoot() {
    return `packages/${kebabCase(this.#answers.name!)}`
  }

  async prompting() {
    this.#answers = await this.prompt([
      {
        message: `What is the packages's name? (Minus the ${
          this.#namespace
        } namespace)`,
        name: 'name',
        type: 'input',
        validate: (x: string) => !!x || 'You must supply a name',
      },
      {
        message: "What's this package about?",
        name: 'description',
        type: 'input',
      },
      {
        message: 'Will this package be published publically?',
        name: 'public',
        type: 'confirm',
      },
    ])
  }

  configuring() {
    this.destinationRoot(this.#relativeDestinationRoot)
    this.sourceRoot(path.resolve(import.meta.dirname, '..', '..', 'templates'))
  }

  async writing() {
    const context = {
      description: this.#answers.description || '',
      name: kebabCase(this.#answers.name!),
      public: this.#answers.public,
      year: new Date().getFullYear(),
    }

    this.packageJson.set('name', `${this.#namespace}/${this.#answers.name}`)
    this.packageJson.set('version', '0.0.0')
    this.packageJson.set('description', this.#answers.description)
    this.packageJson.set('type', 'module')
    this.packageJson.set('exports', { '.': './dist/index.js' })

    if (!this.#answers.public) {
      this.packageJson.set('private', true)
    }

    this.packageJson.set('scripts', {
      build: 'yarn clean && tsc',
      clean: 'rimraf dist',
      start: 'tsc --watch --preserveWatchOutput',
      test: 'vitest --run',
    })

    this.packageJson.set('license', 'MIT')

    this.packageJson.set('bugs', {
      url: 'https://github.com/johngeorgewright/ts-mono-repo/issues',
    })

    this.packageJson.set(
      'homepage',
      'https://github.com/johngeorgewright/ts-mono-repo#readme',
    )

    const devDependencies = ['rimraf', 'vitest', 'typescript']

    await this.addDevDependencies(devDependencies)
    await this.addDependencies(['tslib'])

    this.fs.copy(
      this.templatePath('tsconfig.json'),
      this.destinationPath('tsconfig.json'),
    )

    this.fs.copyTpl(
      this.templatePath('LICENSE'),
      this.destinationPath('LICENSE'),
      context,
    )

    this.fs.copyTpl(
      this.templatePath('README.md'),
      this.destinationPath('README.md'),
      context,
    )

    this.fs.copyTpl(
      this.templatePath('package-src/index.ts.template'),
      this.destinationPath('src/index.ts'),
      context,
    )

    this.fs.copy(
      this.templatePath('package-test/tsconfig.json'),
      this.destinationPath('test/tsconfig.json'),
    )

    this.fs.copyTpl(
      this.templatePath('package-test/index.test.ts.template'),
      this.destinationPath('test/index.test.ts'),
      context,
    )

    await this.#updateVSCodeWS(this.#vsCodeWS)

    if (this.#answers.public) await this.#updateReleasePleaseConfig()
  }

  async #updateVSCodeWS(file: string) {
    const vsCodeWSJSON = this.fs.read(file)
    if (!vsCodeWSJSON) return

    const vsCodeWS = JSON.parse(vsCodeWSJSON)

    vsCodeWS.folders.push({
      name: `📦 ${this.#namespace}/${this.#answers.name}`,
      path: this.#relativeDestinationRoot,
    })

    vsCodeWS.folders.sort((a: any, b: any) =>
      a.name === b.name ? 0 : a.name < b.name ? -1 : 0,
    )

    const prettierOptions = (await prettier.resolveConfig(file)) || {}
    prettierOptions.parser = 'json'

    writeFile(
      file,
      await prettier.format(JSON.stringify(vsCodeWS), prettierOptions),
    )
  }

  async #updateReleasePleaseConfig() {
    const file = 'release-please-config.json'

    const json = this.fs.read(file)
    if (!json) return

    const config = JSON.parse(json)

    config.packages[`packages/${this.#answers.name}`] = {}

    const prettierOptions = (await prettier.resolveConfig(file)) || {}
    prettierOptions.parser = 'json'

    writeFile(
      file,
      await prettier.format(JSON.stringify(config), prettierOptions),
    )
  }

  async install() {
    this.spawn('yarn', [])
  }
}
