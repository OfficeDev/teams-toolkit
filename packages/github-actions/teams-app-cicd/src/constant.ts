/* eslint-disable @typescript-eslint/no-extraneous-class */
export class ActionInputs {
  static readonly ProjectRoot: string = 'project-root'
  static readonly OperationType: string = 'operation-type'
  static readonly Capabilities: string = 'capabilities'
}

export class ActionOutputs {
  static readonly ConfigFilePath: string = 'config-file-path'
  static readonly SharepointPackagePath: string = 'sharepoint-package-path'
  static readonly PackageZipPath: string = 'package-zip-path'
}

export class Commands {
  static readonly TeamsfxCliVersion: string = '0.2.1'
  static readonly NpmInstall: string = 'npm install'
  static readonly NpmRunBuild: string = 'npm run build'
  static readonly TeamsfxProvision = (
    subscriptionId: string,
    version = Commands.TeamsfxCliVersion
  ): string =>
    `npx @microsoft/teamsfx-cli@${version} provision --subscription ${subscriptionId}`
  static readonly TeamsfxDeploy = (
    version = Commands.TeamsfxCliVersion
  ): string => `npx @microsoft/teamsfx-cli@${version} deploy`
  static readonly TeamsfxBuild = (
    version = Commands.TeamsfxCliVersion
  ): string => `npx @microsoft/teamsfx-cli@${version} build`
  static readonly TeamsfxValidate = (
    version = Commands.TeamsfxCliVersion
  ): string => `npx @microsoft/teamsfx-cli@${version} validate`
  static readonly TeamsfxPublish = (
    version = Commands.TeamsfxCliVersion
  ): string => `npx @microsoft/teamsfx-cli@${version} publish`
}

export class Pathes {
  static readonly EnvDefaultJson: string = '.fx/env.default.json'
  static readonly PackageSolutionJson: string =
    'SPFx/config/package-solution.json'
  static readonly TeamsAppPackageZip: string = '.fx/appPackage.zip'
}

export class Miscs {
  static readonly SolutionConfigKey: string = 'solution'
  static readonly BotConfigKey: string = 'fx-resource-bot'
  static readonly LanguageKey: string = 'programmingLanguage'
}

export class ErrorNames {
  static readonly InputsError: string = 'InputsError'
  static readonly LanguageError: string = 'LanguageError'
  static readonly EnvironmentVariableError: string = 'EnvironmentVariableError'
  static readonly SpfxZippedPackageMissingError: string =
    'SpfxZippedPackageMissingError'
  static readonly InternalError: string = 'InternalError'
}

export class Suggestions {
  static readonly CheckInputsAndUpdate: string =
    'Please check and update the input values.'
  static readonly CheckEnvDefaultJson: string = `Please check the content of ${Pathes.EnvDefaultJson}.`
  static readonly CheckPackageSolutionJson: string = `Please check the content of ${Pathes.PackageSolutionJson}.`
  static readonly RerunWorkflow: string =
    'Please rerun the workflow or pipeline.'
  static readonly CreateAnIssue: string = 'Please create an issue on GitHub.'
}
