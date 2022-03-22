// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CICDProvider } from "./provider";
import { ProviderKind } from "./enums";

export class GitHubProvider extends CICDProvider {
  private static instance: GitHubProvider;
  static getInstance() {
    if (!GitHubProvider.instance) {
      GitHubProvider.instance = new GitHubProvider();
      GitHubProvider.instance.scaffoldTo = ".github/workflows";
      GitHubProvider.instance.providerName = ProviderKind.GitHub;
      GitHubProvider.instance.sourceTemplateName = (templateName: string) => {
        return `${templateName}.yml`;
      };
      GitHubProvider.instance.targetTemplateName = (templateName: string, envName: string) => {
        return `${templateName}.${envName}.yml`;
      };
    }
    return GitHubProvider.instance;
  }
}
