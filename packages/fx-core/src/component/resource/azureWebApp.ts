// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  Component,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  ProvisionContextV3,
  Result,
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
@Service("azure-web-app")
export class AzureWebAppResource extends AzureResource {
  readonly name = "azure-web-app";
  readonly bicepModuleName = "azureWebApp";
  readonly outputs = {
    resourceId: {
      key: "resourceId",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.resourceId",
    },
    domain: {
      key: "domain",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.domain",
    },
    endpoint: {
      key: "endpoint",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.endpoint",
    },
    appName: {
      key: "appName",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.appName",
    },
  };
  readonly finalOutputKeys = ["resourceId", "endpoint"];
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
      name: "azure-web-app.deploy",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: `deploy azure web app in folder: ${inputs.projectPath}`,
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

        const webAppState = ctx.envInfo.state[this.name];
        CheckThrowSomethingMissing(
          this.outputs.endpoint.key,
          webAppState[this.outputs.endpoint.key]
        );
        CheckThrowSomethingMissing(
          this.outputs.resourceId.key,
          webAppState[this.outputs.resourceId.key]
        );
        const resourceId = webAppState[this.outputs.resourceId.key];

        const zipBuffer = await utils.zipFolderAsync(publishDir, "");

        await azureWebSiteDeploy(resourceId, ctx.tokenProvider, zipBuffer);
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: `deploy azure web app in folder: ${publishDir}`,
          },
        ]);
      },
    };
    return ok(action);
  }
}
