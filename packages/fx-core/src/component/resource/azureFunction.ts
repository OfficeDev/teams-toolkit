// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  Action,
  ContextV3,
  MaybePromise,
  InputsWithProjectPath,
  Effect,
  ProvisionContextV3,
  Component,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import { Service } from "typedi";
import { azureWebSiteDeploy } from "../../common/azure-hosting/utils";
import { Messages } from "../../plugins/resource/bot/resources/messages";
import * as utils from "../../plugins/resource/bot/utils/common";
import { getLanguage, getRuntime } from "../../plugins/resource/bot/v2/mapping";
import {
  CheckThrowSomethingMissing,
  PackDirectoryExistenceError,
  PreconditionError,
} from "../../plugins/resource/bot/v3/error";
import { AzureResource } from "./azureResource";
@Service("azure-function")
export class AzureFunctionResource extends AzureResource {
  readonly name = "azure-function";
  readonly bicepModuleName = "azureFunction";
  outputs = {
    resourceId: {
      key: "resourceId",
      bicepVariable: "provisionOutputs.azureFunctionOutput.value.resourceId",
    },
    endpoint: {
      key: "endpoint",
      bicepVariable: "provisionOutputs.azureFunctionOutput.value.endpoint",
    },
  };
  finalOutputKeys = ["resourceId", "endpoint"];
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    this.getTemplateContext = (context, inputs) => {
      const configs: string[] = [];
      configs.push(getRuntime(getLanguage(context.projectSetting.programmingLanguage)));
      this.templateContext.configs = configs;
      return this.templateContext;
    };
    return super.generateBicep(context, inputs);
  }
  configure(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-function.configure",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: "config azure function",
          },
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<Effect[], FxError>> => {
        // Configure APIM
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: "config azure function",
          },
        ]);
      },
    };
    return ok(action);
  }
  deploy(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-function.deploy",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: `deploy azure function in folder: ${inputs.projectPath}`,
          },
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        ctx.logProvider.info(Messages.DeployingBot);
        // Preconditions checking.
        const codeComponent = inputs.code as Component;
        if (!inputs.projectPath || !codeComponent?.artifactFolder) {
          throw new PreconditionError(Messages.WorkingDirIsMissing, []);
        }
        const publishDir = path.join(inputs.projectPath, codeComponent.artifactFolder);
        const packDirExisted = await fs.pathExists(publishDir);
        if (!packDirExisted) {
          throw new PackDirectoryExistenceError();
        }

        const states = ctx.envInfo.state[this.name];
        CheckThrowSomethingMissing(this.outputs.endpoint.key, states[this.outputs.endpoint.key]);
        CheckThrowSomethingMissing(
          this.outputs.resourceId.key,
          states[this.outputs.resourceId.key]
        );
        const resourceId = states[this.outputs.resourceId.key];

        const zipBuffer = await utils.zipFolderAsync(publishDir, "");

        await azureWebSiteDeploy(resourceId, ctx.tokenProvider, zipBuffer);
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: `deploy azure function in folder: ${publishDir}`,
          },
        ]);
      },
    };
    return ok(action);
  }
}
