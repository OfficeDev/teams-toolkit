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
import { getComponent } from "../workflow";
import { AzureResourceConfig } from "./azureResourceConfig";

@Service("azure-function-config")
export class AzureFunctionsConfig extends AzureResourceConfig {
  readonly name = "azure-function-config";
  readonly bicepModuleName = "azureFunction";
  readonly requisite = "azure-function";
  references = ["azure-function", "azure-sql", "key-vault", "identity"];
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
        this.templateContext.tabEndpointVarName = compileHandlebarsTemplateString(
          tabHosting.outputs.endpoint.bicepVariable || "",
          { scenario: componentToScenario.get(ComponentNames.TeamsTab) }
        );
      }
    } catch {}
    return super.generateBicep(context, inputs);
  }
}
