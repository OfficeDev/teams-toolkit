// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  Bicep,
  CloudResource,
  ContextV3,
  InputsWithProjectPath,
  ResourceOutputs,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { compileHandlebarsTemplateString } from "../../common/tools";
import { CoreQuestionNames } from "../../core/question";
import { getTemplatesFolder } from "../../folder";
import { languageToRuntime } from "../constants";

export abstract class AzureResource implements CloudResource {
  abstract readonly name: string;
  abstract readonly bicepModuleName: string;
  abstract readonly outputs: ResourceOutputs;
  abstract readonly finalOutputKeys: string[];
  templateContext: Record<string, any> = {};

  async generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Bicep[], FxError>> {
    const pmPath = path.join(
      getTemplatesFolder(),
      "bicep",
      `${this.bicepModuleName}.provision.module.bicep`
    );
    const poPath = path.join(
      getTemplatesFolder(),
      "bicep",
      `${this.bicepModuleName}.provision.orchestration.bicep`
    );
    const configs: string[] = [];
    configs.push(
      languageToRuntime.get(
        context.projectSetting.programmingLanguage ||
          inputs?.[CoreQuestionNames.ProgrammingLanguage]
      ) ?? ""
    );
    this.templateContext.configs = configs;
    const moduleName = this.bicepModuleName + (inputs.scenario || "");
    this.templateContext.componentId = inputs.componentId || "";
    this.templateContext.scenario = inputs.scenario || "";
    this.templateContext.scenarioInLowerCase = (inputs.scenario || "").toLowerCase();
    let module = await fs.readFile(pmPath, "utf-8");
    let orchestration = await fs.readFile(poPath, "utf-8");
    module = compileHandlebarsTemplateString(module, this.templateContext);
    orchestration = compileHandlebarsTemplateString(orchestration, this.templateContext);
    const parametersPath = path.join(
      getTemplatesFolder(),
      "bicep",
      `${this.bicepModuleName}.parameters.json`
    );
    let params;
    if (await fs.pathExists(parametersPath)) {
      params = await fs.readJson(parametersPath);
    }
    const bicep: Bicep = {
      type: "bicep",
      Provision: {
        Modules: { [moduleName]: module },
        Orchestration: orchestration,
      },
      Parameters: params,
    };
    return ok([bicep]);
  }
}
