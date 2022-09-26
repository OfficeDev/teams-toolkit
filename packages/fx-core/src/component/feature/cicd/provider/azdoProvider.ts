// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProviderKind } from "./enums";
import { CICDProvider } from "./provider";

export class AzDoProvider extends CICDProvider {
  private static instance: AzDoProvider;
  static getInstance() {
    if (!AzDoProvider.instance) {
      AzDoProvider.instance = new AzDoProvider();
      AzDoProvider.instance.scaffoldTo = ".azure/pipelines";
      AzDoProvider.instance.providerName = ProviderKind.AzDo;
      AzDoProvider.instance.sourceTemplateName = (templateName: string) => {
        return `${templateName}.yml`;
      };
      AzDoProvider.instance.targetTemplateName = (templateName: string, envName: string) => {
        return `${templateName}.${envName}.yml`;
      };
    }
    return AzDoProvider.instance;
  }
}
