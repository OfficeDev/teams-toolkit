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
@Service("apim-config")
export class APIMConfig extends AzureResourceConfig {
  readonly name = "apim-config";
  readonly bicepModuleName = "apim";
  readonly requisite = "apim";
  references = ComponentConnections[ComponentNames.APIM];
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
    inputs.scenario = "";
    inputs.componentId = "";
    return super.generateBicep(context, inputs);
  }
}
