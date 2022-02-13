// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CICDProvider } from "./provider";

export class JenkinsProvider extends CICDProvider {
  private static instance: JenkinsProvider;
  static getInstance() {
    if (!JenkinsProvider.instance) {
      JenkinsProvider.instance = new JenkinsProvider();
    }
    return JenkinsProvider.instance;
  }
}
