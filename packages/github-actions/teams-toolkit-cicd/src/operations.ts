import * as path from 'path'
import {Capability} from './enums/capabilities'
import {Execute} from './utils/exec'
import {Commands, Pathes, Miscs, ActionOutputs} from './constant'
import {ProgrammingLanguage} from './enums/programmingLanguages'
import * as fs from 'fs-extra'
import * as core from '@actions/core'
import {LanguageError} from './errors'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Operations {
  static async BuildTeamsApp(
    projectRoot: string,
    capabilities: string[]
  ): Promise<void> {
    const tabsPath = path.join(projectRoot, Capability.Tabs)
    if (
      capabilities.includes(Capability.Tabs) &&
      (await fs.pathExists(tabsPath))
    ) {
      await Execute(Commands.NpmInstall, tabsPath)
      await Execute(Commands.NpmRunBuild, tabsPath)
    }

    const botPath = path.join(projectRoot, Capability.Bot)
    if (
      capabilities.includes(Capability.Bot) &&
      (await fs.pathExists(botPath))
    ) {
      // Get bot's programming language from env.default.json.
      const config = await fs.readJSON(Pathes.EnvDefaultJson)
      const lang = config?.[Miscs.BotConfigKey]?.[Miscs.LanguageKey]
      if (!lang || !Object.values<string>(ProgrammingLanguage).includes(lang)) {
        throw new LanguageError(`programmingLanguage: ${lang}`)
      }
      core.info(`The bot project is using ${lang}.`)
      await Execute(Commands.NpmInstall, botPath)
      if (lang === ProgrammingLanguage.TypeScript) {
        await Execute(Commands.NpmRunBuild, botPath)
      }
    }

    const SpfxPath = path.join(projectRoot, Capability.SPFx)
    if (
      capabilities.includes(Capability.SPFx) &&
      (await fs.pathExists(SpfxPath))
    ) {
      await Execute(Commands.NpmInstall, SpfxPath)
      await Execute(Commands.NpmRunBuild, SpfxPath)
    }
  }

  static async ProvisionHostingEnvironment(
    projectRoot: string
  ): Promise<number> {
    const ret = await Execute(
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
    const ret = await Execute(Commands.TeamsfxDeploy, projectRoot)

    const packageSolutionPath = path.join(
      projectRoot,
      Pathes.PackageSolutionJson
    )
    if (await fs.pathExists(packageSolutionPath)) {
      const solutionConfig = await fs.readJSON(packageSolutionPath)
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
    const ret = await Execute(Commands.TeamsfxBuild, projectRoot)
    if (ret === 0) {
      core.setOutput(
        ActionOutputs.PackageZipPath,
        path.join(projectRoot, Pathes.TeamsAppPackageZip)
      )
    }
    return ret
  }

  static async ValidateTeamsAppManifest(projectRoot: string): Promise<number> {
    return await Execute(Commands.TeamsfxValidate, projectRoot)
  }

  static async PublishTeamsApp(projectRoot: string): Promise<number> {
    return await Execute(Commands.TeamsfxPublish, projectRoot)
  }
}
