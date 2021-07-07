import {Commands} from './constant'
import {InternalError} from './errors'
import {buildMap} from './buildMap'

export class BuildMapQuerier {
  static instance: BuildMapQuerier
  static validOutputs: string[] = [Commands.NpmInstall, Commands.NpmRunBuild]

  private constructor() {}
  static async getInstance(): Promise<BuildMapQuerier> {
    if (!BuildMapQuerier.instance) {
      BuildMapQuerier.instance = new BuildMapQuerier()
    }

    return BuildMapQuerier.instance
  }

  query(cap: string, lang?: string): string[] {
    const commands = this._query(cap, lang)

    if (commands.some(value => !BuildMapQuerier.validOutputs.includes(value))) {
      throw new InternalError('Invalid command/s found in buildMap.json')
    }

    return commands
  }
  private _query(cap: string, lang?: string): string[] {
    const capItems = buildMap[cap]
    if (!capItems) {
      throw new InternalError(`Cannot find ${cap} in buildMap.json.`)
    }

    if (Array.isArray(capItems)) {
      return capItems
    }

    if (!lang) {
      throw new InternalError('programmingLanguage is required but undefined.')
    }
    const capLang = capItems[lang]
    if (!capLang) {
      throw new InternalError(`Cannot find ${cap}.${lang} in buildMap.json.`)
    }

    return capLang
  }
}
