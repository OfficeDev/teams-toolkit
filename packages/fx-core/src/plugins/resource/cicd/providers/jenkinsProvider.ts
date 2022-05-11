// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ProviderKind } from "./enums";
import { CICDProvider } from "./provider";

export class JenkinsProvider extends CICDProvider {
  private static instance: JenkinsProvider;
  static getInstance() {
    if (!JenkinsProvider.instance) {
      JenkinsProvider.instance = new JenkinsProvider();
      JenkinsProvider.instance.scaffoldTo = ".jenkins/pipelines";
      JenkinsProvider.instance.providerName = ProviderKind.Jenkins;
      JenkinsProvider.instance.sourceTemplateName = (templateName: string) => {
        return `Jenkinsfile.${templateName}`;
      };
      JenkinsProvider.instance.targetTemplateName = (templateName: string, envName: string) => {
        return `Jenkinsfile.${templateName}.${envName}`;
      };
    }
    return JenkinsProvider.instance;
  }
}
