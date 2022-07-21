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
import { compileHandlebarsTemplateString } from "../../common/tools";
import { ComponentNames, componentToScenario } from "../constants";
import { ComponentConnections } from "../utils";
import { getComponent } from "../workflow";
import { AzureResourceConfig } from "./azureResourceConfig";
@Service("azure-web-app-config")
export class AzureWebAppConfig extends AzureResourceConfig {
  readonly name = "azure-web-app-config";
  readonly bicepModuleName = "azureWebApp";
  readonly requisite = "azure-web-app";
  references = ComponentConnections[ComponentNames.AzureWebApp];
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    try {
      const tabConfig = getComponent(context.projectSetting, ComponentNames.TeamsTab);
      if (tabConfig?.hosting) {
        const tabHosting = Container.get(tabConfig.hosting) as CloudResource;
        this.templateContext.tabDomainVarName = compileHandlebarsTemplateString(
          tabHosting.outputs.domain.bicepVariable || "",
          { scenario: componentToScenario.get(ComponentNames.TeamsTab) }
        );
      }
    } catch {}
    return super.generateBicep(context, inputs);
  }
}
