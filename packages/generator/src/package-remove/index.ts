import * as pathHelper from 'path'
import { readdir, writeFile } from 'fs/promises'
import Generator from 'yeoman-generator'
import { validateGenerationFromRoot } from '../validation.ts'
import prettier from 'prettier'
import { rimraf } from 'rimraf'

export default class RemovePackageGenerator extends Generator {
  #vsCodeWS = 'plugola.code-workspace'
  #packagesPath = pathHelper.resolve(import.meta.dirname, '..', '..', '..')
  #answers: { names?: string[] } = {}

  initializing() {
    validateGenerationFromRoot(this)
  }

  async prompting() {
    this.#answers = await this.prompt({
      message: `Which packages do you want to delete?`,
      name: 'names',
      type: 'checkbox',
      choices: await this.#getPackages(),
    })

    if (!this.#answers.names?.length) {
      this.startOver()
    }
  }

  async #getPackages() {
    return (await readdir(this.#packagesPath, { withFileTypes: true })).filter(
      (entry) => entry.isDirectory() && entry.name !== 'generator',
    )
  }

  async writing() {
    for (const name of this.#answers.names!) {
      await rimraf(`${this.#packagesPath}/${name}`)
    }

    await this.#updateVSCodeWS(this.#vsCodeWS)
    await this.#updateReleasePleaseConfig()
  }

  async #updateVSCodeWS(file: string) {
    const vsCodeWSJSON = this.fs.read(file)
    if (!vsCodeWSJSON) return

    const vsCodeWS = JSON.parse(vsCodeWSJSON)

    vsCodeWS.folders = vsCodeWS.folders.filter(
      (folder: any) =>
        !this.#answers.names?.find((name) => folder.name.endsWith(`/${name}`)),
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

    for (const name of this.#answers.names ?? [])
      delete config.packages[`packages/${name}`]

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
