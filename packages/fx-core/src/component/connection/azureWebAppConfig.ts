// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  CloudResource,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { getComponent } from "../workflow";
import { AzureResourceConfig } from "./azureResourceConfig";
@Service("azure-web-app-config")
export class AzureWebAppConfig extends AzureResourceConfig {
  readonly name = "azure-web-app-config";
  readonly bicepModuleName = "azureWebApp";
  readonly requisite = "azure-web-app";
  references = ["azure-web-app", "azure-sql", "key-vault", "identity", "azure-function"];
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    try {
      const tabConfig = getComponent(context.projectSetting, "teams-tab");
      if (tabConfig?.hosting) {
        const tabHosting = Container.get(tabConfig.hosting) as CloudResource;
        this.templateContext.tabDomainVarName = tabHosting.outputs.endpoint.bicepVariable;
      }
    } catch {}
    return super.generateBicep(context, inputs);
  }
}
