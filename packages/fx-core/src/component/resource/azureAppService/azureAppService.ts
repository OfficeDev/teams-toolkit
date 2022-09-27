// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  InputsWithProjectPath,
  ok,
  ResourceContextV3,
  ResourceOutputs,
  Result,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import { azureWebSiteDeploy } from "../../../common/azure-hosting/utils";
import * as utils from "./common";
import {
  CheckThrowSomethingMissing,
  PackDirectoryExistenceError,
  PreconditionError,
} from "../../error";
import { AzureResource } from "./../azureResource";
import { ProgressMessages, ProgressTitles, ErrorMessage } from "../../messages";
import { AzureOperations } from "../../../common/azure-hosting/azureOps";
import {
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
} from "../../../common/tools";

export abstract class AzureAppService extends AzureResource {
  abstract readonly name: string;
  abstract readonly alias: string;
  abstract readonly displayName: string;
  abstract readonly bicepModuleName: string;
  abstract readonly outputs: ResourceOutputs;
  abstract readonly finalOutputKeys: string[];
  async deploy(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    restart = false,
    givenResourceIdKey?: string
  ): Promise<Result<undefined, FxError>> {
    const progressBar = context.userInteraction.createProgressBar(
      ProgressTitles.deploying(this.displayName, inputs.scenario),
      2
    );
    await progressBar.start();
    try {
      // Preconditions checking.
      if (!inputs.projectPath || !inputs.artifactFolder) {
        throw new PreconditionError(this.alias, ErrorMessage.WorkingDirIsMissing, []);
      }
      const publishDir = path.resolve(inputs.projectPath, inputs.artifactFolder);
      const packDirExisted = await fs.pathExists(publishDir);
      if (!packDirExisted) {
        throw new PackDirectoryExistenceError(this.alias);
      }

      const state = context.envInfo.state[inputs.componentId];
      const resourceIdKey = givenResourceIdKey || this.outputs.resourceId.key;
      const resourceId = CheckThrowSomethingMissing(this.name, resourceIdKey, state[resourceIdKey]);
      await progressBar.next(ProgressMessages.packingCode);
      const zipBuffer = await utils.zipFolderAsync(publishDir, "");

      const client = await azureWebSiteDeploy(
        resourceId,
        context.tokenProvider,
        zipBuffer,
        context.logProvider,
        progressBar
      );
      if (restart) {
        await AzureOperations.restartWebApp(
          client,
          getResourceGroupNameFromResourceId(resourceId),
          getSiteNameFromResourceId(resourceId),
          context.logProvider
        );
      }
    } finally {
      progressBar.end(true);
    }
    return ok(undefined);
  }
}
