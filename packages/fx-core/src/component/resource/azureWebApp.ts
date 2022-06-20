// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
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
            remarks: `deploy azure web app in folder: ${path.join(
              inputs.projectPath,
              inputs.folder
            )}`,
          },
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        ctx.logProvider.info(Messages.DeployingBot);
        // Preconditions checking.
        const workingDir = path.join(inputs.projectPath, inputs.folder);
        if (!workingDir) {
          throw new PreconditionError(Messages.WorkingDirIsMissing, []);
        }
        const packDirExisted = await fs.pathExists(workingDir);
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

        const zipBuffer = await utils.zipFolderAsync(workingDir, "");

        await azureWebSiteDeploy(resourceId, ctx.tokenProvider, zipBuffer);
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: `deploy azure web app in folder: ${workingDir}`,
          },
        ]);
      },
    };
    return ok(action);
  }
}
