// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class Messages {
  // Logging messages
  static readonly StartScaffold = (name: string) => `Scaffolding '${name}'.`;
  static readonly EndScaffold = (name: string) => `Successfully scaffolded '${name}'.`;
  static readonly StartPreDeploy = (name: string) => `Pre-deploying '${name}'.`;
  static readonly EndPreDeploy = (name: string) => `Pre-deployed '${name}'.`;
  static readonly StartDeploy = (name: string) => `Deploying '${name}'.`;
  static readonly EndDeploy = (name: string) => `Successfully deployed '${name}'.`;

  static readonly getTemplateFrom = (url: string) => `Retrieving template from '${url}'.`;

  static readonly FailedFetchTemplate =
    "Failed to retrieve latest template from GitHub. Using local template instead.";
}
