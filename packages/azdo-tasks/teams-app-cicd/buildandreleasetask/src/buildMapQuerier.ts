import {InternalError} from './errors'
import {buildMap} from './buildMap'

export class BuildMapQuerier {
  static instance: BuildMapQuerier

  private constructor() {}

  static getInstance(): BuildMapQuerier {
    if (!BuildMapQuerier.instance) {
      BuildMapQuerier.instance = new BuildMapQuerier()
    }

    return BuildMapQuerier.instance
  }

  query(cap: string, lang?: string): string[] {
    const capItems = buildMap[cap]
    if (!capItems) {
      throw new InternalError(`Cannot find ${cap} in buildMap.`)
    }

    // If the cap's build commands are irrelevant to programming language,
    // then the value should be the command list.
    // Or it should be indexed by programming language.
    if (Array.isArray(capItems)) {
      return capItems
    }

    if (!lang) {
      throw new InternalError('programmingLanguage is required but undefined.')
    }
    const capLang = capItems[lang]
    if (!capLang) {
      throw new InternalError(`Cannot find ${cap}.${lang} in buildMap.`)
    }

    return capLang
  }
}
