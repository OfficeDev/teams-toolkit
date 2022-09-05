// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzDoProvider } from "./azdoProvider";
import { ProviderKind } from "./enums";
import { GitHubProvider } from "./githubProvider";
import { JenkinsProvider } from "./jenkinsProvider";
import { CICDProvider } from "./provider";

export class CICDProviderFactory {
  static create(providerKind: ProviderKind): CICDProvider {
    switch (providerKind) {
      case ProviderKind.GitHub: {
        return GitHubProvider.getInstance();
      }
      case ProviderKind.AzDo: {
        return AzDoProvider.getInstance();
      }
      case ProviderKind.Jenkins: {
        return JenkinsProvider.getInstance();
      }
      default:
        return GitHubProvider.getInstance();
    }
  }
}
