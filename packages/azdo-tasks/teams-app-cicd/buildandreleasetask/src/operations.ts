import * as path from 'path'
import {Execute} from './utils/exec'
import {Commands, Pathes, Miscs, ActionOutputs} from './constant'
import {ProgrammingLanguage} from './enums/programmingLanguages'
import * as fs from 'fs-extra'
import {LanguageError, SpfxZippedPackageMissingError} from './errors'
import {BuildMapQuerier} from './buildMapQuerier'
import * as tl from 'azure-pipelines-task-lib/task'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Operations {
  static async BuildTeamsApp(
    projectRoot: string,
    capabilities: string[]
  ): Promise<void> {
    // Get the project's programming language from env.default.json.
    const envDefaultPath = path.join(projectRoot, Pathes.EnvDefaultJson)
    const config = await fs.readJSON(envDefaultPath)
    const lang = config?.[Miscs.SolutionConfigKey]?.[Miscs.LanguageKey]
    if (!lang || !Object.values<string>(ProgrammingLanguage).includes(lang)) {
      throw new LanguageError(`programmingLanguage: ${lang}`)
    }

    const promises: Promise<void>[] = capabilities.map(async (cap: string) => {
      const capPath = path.join(projectRoot, cap)
      const buildMapQuerier = BuildMapQuerier.getInstance()
      const commands = buildMapQuerier.query(cap, lang)
      if (await fs.pathExists(capPath)) {
        for (const command of commands) {
          const parts = command.split(' ')
          await Execute(parts[0], parts.splice(1), capPath)
        }
      }
    })

    await Promise.all(promises)
  }

  static async ProvisionHostingEnvironment(
    projectRoot: string
  ): Promise<number> {
    const parts = Commands.TeamsfxProvision(process.env.TEST_SUBSCRIPTION_ID!).split(' ')
    const ret = await Execute(
      parts[0],
      parts.splice(1),
      projectRoot
    )

    if (ret === 0) {
      tl.setVariable(
        ActionOutputs.ConfigFilePath,
        path.join(projectRoot, Pathes.EnvDefaultJson),
        false,
        true
      )
    }

    return ret
  }

  static async DeployToHostingEnvironment(
    projectRoot: string
  ): Promise<number> {
    const parts = Commands.TeamsfxDeploy.split(' ')
    const ret = await Execute(parts[0], parts.splice(1), projectRoot)

    const packageSolutionPath = path.join(
      projectRoot,
      Pathes.PackageSolutionJson
    )
    if (await fs.pathExists(packageSolutionPath)) {
      const solutionConfig = await fs.readJSON(packageSolutionPath)
      if (!solutionConfig?.paths?.zippedPackage) {
        throw new SpfxZippedPackageMissingError()
      }
      tl.setVariable(
        ActionOutputs.SharepointPackagePath,
        path.join(
          projectRoot,
          'SPFx',
          'sharepoint',
          solutionConfig?.paths?.zippedPackage
        ),
        false,
        true
      )
    }
    return ret
  }

  static async PackTeamsApp(projectRoot: string): Promise<number> {
    const parts = Commands.TeamsfxBuild.split(' ')
    const ret = await Execute(parts[0], parts.splice(1), projectRoot)
    if (ret === 0) {
      tl.setVariable(
        ActionOutputs.PackageZipPath,
        path.join(projectRoot, Pathes.TeamsAppPackageZip),
        false,
        true
      )
    }
    return ret
  }

  static async ValidateTeamsAppManifest(projectRoot: string): Promise<number> {
    const parts = Commands.TeamsfxValidate.split(' ')
    return await Execute(parts[0], parts.splice(1), projectRoot)
  }

  static async PublishTeamsApp(projectRoot: string): Promise<number> {
    const parts = Commands.TeamsfxPublish.split(' ')
    return await Execute(parts[0], parts.splice(1), projectRoot)
  }
}
