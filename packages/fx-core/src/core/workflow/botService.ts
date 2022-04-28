// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { ArmTemplateResult } from "../../common/armInterface";
import { compileHandlebarsTemplateString } from "../../common/tools";
import { getTemplatesFolder } from "../../folder";
import { AzureWebAppResource } from "./azureWebApp";
import { Action, ContextV3, MaybePromise } from "./interface";
@Service("bot-service")
export class BotServiceResource {
  readonly name = "bot-service";
  generateBicep(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bot-service.generateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok(["generate bicep for bot-service"]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const componentInput = inputs["bot-service"];
        const mPath = path.join(getTemplatesFolder(), "demo", "botService.config.module.bicep");
        const oPath = path.join(
          getTemplatesFolder(),
          "demo",
          "botService.config.orchestration.bicep"
        );
        let module = await fs.readFile(mPath, "utf-8");
        const templateContext: any = {};
        if (componentInput.hostingResource === "azure-web-app") {
          const resource = Container.get("azure-web-app") as AzureWebAppResource;
          templateContext.endpointVarName = resource.outputs.endpoint.bicepVariable;
        }
        module = compileHandlebarsTemplateString(module, templateContext);
        const orch = await fs.readFile(oPath, "utf-8");
        const armTemplate: ArmTemplateResult = {
          Configuration: { Modules: { botService: module }, Orchestration: orch },
        };
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
