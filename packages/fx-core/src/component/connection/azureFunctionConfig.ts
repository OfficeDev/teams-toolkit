// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  Bicep,
  CloudResource,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container, Service } from "typedi";
import * as path from "path";
import fs from "fs-extra";
import { getTemplatesFolder } from "../../folder";
import { getComponent } from "../workflow";
import { compileHandlebarsTemplateString } from "../../common/tools";
import { AzureWebAppResource } from "../resource/azureWebApp";
import { AzureStorageResource } from "../resource/azureStorage";
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
      const tabConfig = getComponent(context.projectSetting, "teams-tab");
      if (tabConfig?.hosting) {
        const tabHosting = Container.get(tabConfig.hosting) as CloudResource;
        this.templateContext.tabDomainVarName = tabHosting.outputs.endpoint.bicepVariable;
      }
    } catch {}
    return super.generateBicep(context, inputs);
  }
}
