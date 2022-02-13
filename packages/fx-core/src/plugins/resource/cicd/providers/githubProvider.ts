// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CICDProvider } from "./provider";

export class GitHubProvider extends CICDProvider {
  private static instance: GitHubProvider;
  static getInstance() {
    if (!GitHubProvider.instance) {
      GitHubProvider.instance = new GitHubProvider();
    }
    return GitHubProvider.instance;
  }
}
