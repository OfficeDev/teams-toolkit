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
@Service("apim-config")
export class APIMConfig extends AzureResourceConfig {
  readonly name = "apim-config";
  readonly bicepModuleName = "apim";
  readonly requisite = "apim";
  references = [];
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
