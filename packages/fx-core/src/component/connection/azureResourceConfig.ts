// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Bicep,
  CloudResource,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Container } from "typedi";
import { compileHandlebarsTemplateString } from "../../common/tools";
import { getProjectTemplatesFolderPath } from "../../common/utils";
import { CoreQuestionNames } from "../../core/question";
import { getTemplatesFolder } from "../../folder";
import { languageToRuntime } from "../constants";
import { getComponentByScenario } from "../workflow";

export abstract class AzureResourceConfig {
  abstract readonly name: string;
  abstract readonly bicepModuleName: string;
  abstract readonly requisite: string;
  abstract references: string[];
  templateContext: Record<string, any> = {};
  async generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Bicep[], FxError>> {
    const update = inputs.update as boolean;
    const requisiteComponent = getComponentByScenario(
      context.projectSetting,
      this.requisite,
      inputs.scenario
    );
    if (!requisiteComponent) return ok([]);
    this.templateContext.connections = requisiteComponent.connections || [];
    for (const refComponentName of this.references) {
      this.templateContext[refComponentName] = { outputs: {} };
      try {
        const refResource = Container.get(refComponentName) as CloudResource;
        if (refResource.outputs) {
          for (const key of Object.keys(refResource.outputs)) {
            const entry = refResource.outputs[key];
            const value = compileHandlebarsTemplateString(entry.bicepVariable ?? "", inputs);
            this.templateContext[refComponentName].outputs[entry.key] = value;
          }
        }
      } catch (e) {}
    }
    this.templateContext.scenario = inputs.scenario || "";
    this.templateContext.scenarioInLowerCase = (inputs.scenario || "").toLowerCase();
    const configs: string[] = [];
    configs.push(
      languageToRuntime.get(
        context.projectSetting.programmingLanguage ||
          inputs?.[CoreQuestionNames.ProgrammingLanguage]
      ) ?? ""
    );
    this.templateContext.configs = configs;
    const modulePath = path.join(
      getTemplatesFolder(),
      "bicep",
      `${this.bicepModuleName}.config.module.bicep`
    );
    let module = await fs.readFile(modulePath, "utf-8");
    module = compileHandlebarsTemplateString(module, this.templateContext);
    const templatesFolder = await getProjectTemplatesFolderPath(inputs.projectPath);
    const targetModuleFilePath = path.join(
      templatesFolder,
      "azure",
      "teamsFx",
      `${this.bicepModuleName}${inputs.scenario}Config.bicep`
    );
    const targetModuleFilePathExists = await fs.pathExists(targetModuleFilePath);
    const sourceOrchTemplatePath = path.join(
      getTemplatesFolder(),
      "bicep",
      `${this.bicepModuleName}.config.orchestration.bicep`
    );
    // orchestration part will be added only for first time
    const orch = targetModuleFilePathExists
      ? undefined
      : compileHandlebarsTemplateString(
          await fs.readFile(sourceOrchTemplatePath, "utf-8"),
          this.templateContext
        );
    const moduleName = this.bicepModuleName + (inputs.scenario || "");
    const bicep: Bicep = {
      type: "bicep",
      Configuration: {
        Modules: { [`${moduleName}Config`]: module },
        Orchestration: update ? undefined : orch,
      },
    };
    return ok([bicep]);
  }
}
