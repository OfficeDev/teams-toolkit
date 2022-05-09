// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  Action,
  Bicep,
  ContextV3,
  MaybePromise,
  InputsWithProjectPath,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { compileHandlebarsTemplateString } from "../../common/tools";
import { getTemplatesFolder } from "../../folder";
import { AzureWebAppResource } from "./azureWebApp";
import { persistConfigBicepPlans } from "../bicepUtils";

@Service("bot-service")
export class BotServiceResource {
  readonly name = "bot-service";
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bot-service.generateBicep",
      type: "function",
      plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const plans = await persistConfigBicepPlans(inputs.projectPath, {
          Modules: { botService: "1" },
          Orchestration: "1",
        });
        return ok(plans);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<Bicep, FxError>> => {
        const mPath = path.join(getTemplatesFolder(), "bicep", "botService.config.module.bicep");
        const oPath = path.join(
          getTemplatesFolder(),
          "bicep",
          "botService.config.orchestration.bicep"
        );
        let module = await fs.readFile(mPath, "utf-8");
        const templateContext: any = {};
        if (inputs.hosting === "azure-web-app") {
          const resource = Container.get("azure-web-app") as AzureWebAppResource;
          templateContext.endpointVarName = resource.outputs.endpoint.bicepVariable;
        }
        module = compileHandlebarsTemplateString(module, templateContext);
        const orch = await fs.readFile(oPath, "utf-8");
        const armTemplate: Bicep = {
          Configuration: { Modules: { botService: module }, Orchestration: orch },
        };
        return ok(armTemplate);
      },
    };
    return ok(action);
  }
  provision(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const provision: Action = {
      name: "bot-service.provision",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok(["create AAD app for bot service (botId, botPassword)"]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        // create bot aad app by API call
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
