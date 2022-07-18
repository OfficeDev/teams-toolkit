// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  IProgressHandler,
  MaybePromise,
  ok,
  ProvisionContextV3,
  ResourceOutputs,
  Result,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import { azureWebSiteDeploy } from "../../../common/azure-hosting/utils";
import * as utils from "../../../plugins/resource/bot/utils/common";
import { getLanguage, getRuntime } from "../../../plugins/resource/bot/v2/mapping";
import {
  CheckThrowSomethingMissing,
  PackDirectoryExistenceError,
  PreconditionError,
} from "./errors";
import { AzureResource } from "./../azureResource";
import { Messages } from "./messages";
import { getHostingParentComponent } from "../../workflow";
import { ProgressBarConstants } from "../../../plugins/resource/bot/constants";
export abstract class AzureAppService extends AzureResource {
  abstract readonly name: string;
  abstract readonly alias: string;
  abstract readonly displayName: string;
  abstract readonly bicepModuleName: string;
  abstract readonly outputs: ResourceOutputs;
  abstract readonly finalOutputKeys: string[];
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
  deploy(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: `${this.name}.deploy`,
      type: "function",
      enableProgressBar: true,
      progressTitle: `Deploy ${this.name}` + inputs.scenario ? `[${inputs.scenario}]` : "",
      progressSteps: 2,
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const parent = getHostingParentComponent(context.projectSetting, this.name);
        const deployDir = path.resolve(inputs.projectPath, parent?.folder ?? "");
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: `deploy ${this.displayName} in folder: ${deployDir}`,
          },
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath,
        progress?: IProgressHandler
      ) => {
        const ctx = context as ProvisionContextV3;
        const parent = getHostingParentComponent(ctx.projectSetting, this.name, inputs.scenario);
        // Preconditions checking.
        if (!inputs.projectPath || !parent?.artifactFolder) {
          throw new PreconditionError(this.alias, Messages.WorkingDirIsMissing, []);
        }
        const publishDir = path.resolve(inputs.projectPath, parent.artifactFolder);
        const packDirExisted = await fs.pathExists(publishDir);
        if (!packDirExisted) {
          throw new PackDirectoryExistenceError(this.alias);
        }

        const state = ctx.envInfo.state[parent.name];
        const resourceId = CheckThrowSomethingMissing(
          this.alias,
          this.outputs.resourceId.key,
          state[this.outputs.resourceId.key]
        );
        await progress?.next(ProgressBarConstants.DEPLOY_STEP_ZIP_FOLDER);
        const zipBuffer = await utils.zipFolderAsync(publishDir, "");

        await azureWebSiteDeploy(
          resourceId,
          ctx.tokenProvider,
          zipBuffer,
          context.logProvider,
          progress
        );
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: `deploy ${this.displayName} in folder: ${publishDir}`,
          },
        ]);
      },
    };
    return ok(action);
  }
}
