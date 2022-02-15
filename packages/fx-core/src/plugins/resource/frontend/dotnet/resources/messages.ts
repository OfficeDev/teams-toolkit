// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class Messages {
  // Logging messages
  static readonly StartScaffold = "Scaffolding.";
  static readonly EndScaffold = "Successfully scaffolded.";
  static readonly StartDeploy = "Deploying.";
  static readonly EndDeploy = "Successfully deployed.";
  static readonly StartGenerateArmTemplates = "Generating ARM templates.";
  static readonly EndGenerateArmTemplates = "Successfully generated ARM templates.";
  static readonly StartUpdateArmTemplates = "Updating ARM templates.";
  static readonly EndUpdateArmTemplates = "Successfully updated ARM templates.";

  static readonly getTemplateFrom = (url: string) => `Retrieving template from '${url}'.`;
  static readonly FailedFetchTemplate =
    "Failed to retrieve latest template from GitHub. Using local template instead.";

  static readonly Build = (projectPath: string) => `Building ${projectPath}.`;
  static readonly GenerateZip = (projectPath: string) => `Adding ${projectPath} to zip package.`;
  static readonly FailQueryPublishCred = "Failed to find publish credentials.";
  static readonly UploadZip = (size: number) => `Upload zip package (${size}B).`;
}

export class ProgressTitle {
  static readonly DeployProgressTitle = "Deploying to Azure Web App";
}

export class ProgressMessages {
  static readonly Build = "Building target project.";
  static readonly GenerateZip = "Generating zip package.";
  static readonly FetchCredential = "Retrieving deploy credentials.";
  static readonly Deploy = "Uploading zip package.";
}
