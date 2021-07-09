import * as path from 'path'
import {CommandUtil} from './utils/exec'
import {Commands, Pathes, Miscs, ActionOutputs} from './constant'
import {ProgrammingLanguage} from './enums/programmingLanguages'
import * as fs from 'fs-extra'
import * as core from '@actions/core'
import {LanguageError, SpfxZippedPackageMissingError} from './errors'
import {BuildMapQuerier} from './buildMapQuerier'

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
    core.info(`The project is using ${lang}.`)

    const promises: Promise<void>[] = capabilities.map(async (cap: string) => {
      const capPath = path.join(projectRoot, cap)
      const buildMapQuerier = BuildMapQuerier.getInstance()
      const commands = buildMapQuerier.query(cap, lang)
      if (await fs.pathExists(capPath)) {
        for (const command of commands) {
          await CommandUtil.Execute(command, capPath)
        }
      }
    })

    await Promise.all(promises)
  }

  static async ProvisionHostingEnvironment(
    projectRoot: string
  ): Promise<number> {
    const ret = await CommandUtil.Execute(
      Commands.TeamsfxProvision(process.env.TEST_SUBSCRIPTION_ID!),
      projectRoot
    )

    if (ret === 0) {
      core.setOutput(
        ActionOutputs.ConfigFilePath,
        path.join(projectRoot, Pathes.EnvDefaultJson)
      )
    }

    return ret
  }

  static async DeployToHostingEnvironment(
    projectRoot: string
  ): Promise<number> {
    const ret = await CommandUtil.Execute(Commands.TeamsfxDeploy, projectRoot)

    const packageSolutionPath = path.join(
      projectRoot,
      Pathes.PackageSolutionJson
    )
    if (await fs.pathExists(packageSolutionPath)) {
      const solutionConfig = await fs.readJSON(packageSolutionPath)
      if (!solutionConfig?.paths?.zippedPackage) {
        throw new SpfxZippedPackageMissingError()
      }
      core.setOutput(
        ActionOutputs.SharepointPackagePath,
        path.join(
          projectRoot,
          'SPFx',
          'sharepoint',
          solutionConfig?.paths?.zippedPackage
        )
      )
    }
    return ret
  }

  static async PackTeamsApp(projectRoot: string): Promise<number> {
    const ret = await CommandUtil.Execute(Commands.TeamsfxBuild, projectRoot)
    if (ret === 0) {
      core.setOutput(
        ActionOutputs.PackageZipPath,
        path.join(projectRoot, Pathes.TeamsAppPackageZip)
      )
    }
    return ret
  }

  static async ValidateTeamsAppManifest(projectRoot: string): Promise<number> {
    return await CommandUtil.Execute(Commands.TeamsfxValidate, projectRoot)
  }

  static async PublishTeamsApp(projectRoot: string): Promise<number> {
    return await CommandUtil.Execute(Commands.TeamsfxPublish, projectRoot)
  }
}
