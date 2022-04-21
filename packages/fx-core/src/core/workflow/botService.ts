// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../common/armInterface";
import { compileHandlebarsTemplateString } from "../../common/tools";
import { getTemplatesFolder } from "../../folder";
import { Action, CloudResource, ContextV3, MaybePromise } from "./interface";
@Service("bot-service")
export class BotServiceResource implements CloudResource {
  readonly name = "bot-service";
  generateBicep(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bot-service.generateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const outputPath = path.join(
          inputs.projectPath,
          "templates",
          "azure",
          "$botService.provision.bicep"
        );
        return ok([`create file: ${outputPath}`]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const componentInput = inputs["bot-service"];
        const armTemplate: ArmTemplateResult = {
          Configuration: { Modules: {} },
        };
        {
          const filePath = path.join(
            getTemplatesFolder(),
            "demo",
            "botService.config.module.bicep"
          );
          if (await fs.pathExists(filePath)) {
            let content = await fs.readFile(filePath, "utf-8");
            content = compileHandlebarsTemplateString(content, {
              hostingResource: componentInput.hostingResource,
            });
            armTemplate.Configuration!.Modules!["botService"] = content;
          }
        }
        {
          const filePath = path.join(
            getTemplatesFolder(),
            "demo",
            "botService.config.orchestration.bicep"
          );
          if (await fs.pathExists(filePath)) {
            const content = await fs.readFile(filePath, "utf-8");
            armTemplate.Configuration!.Orchestration = content;
          }
        }
        if (!context.bicep) context.bicep = {};
        context.bicep["bot-service"] = armTemplate;
        return ok(undefined);
      },
    };
    return ok(action);
  }
  provision(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const provision: Action = {
      name: "bot-service.provision",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok(["create AAD app for bot service (botId, botPassword)"]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        inputs["bot-service"] = {
          botId: "MockBotId",
          botPassword: "MockBotPassword",
        };
        return ok(undefined);
      },
    };
    return ok(provision);
  }
}
