// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  Action,
  Bicep,
  CloudResource,
  ContextV3,
  MaybePromise,
  InputsWithProjectPath,
  ProvisionContextV3,
  EnvConfig,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import {
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../common/tools";
import { getTemplatesFolder } from "../../folder";
import { DeployMgr } from "../../plugins/resource/bot/deployMgr";
import { ProgrammingLanguage } from "../../plugins/resource/bot/enums/programmingLanguage";
import { LanguageStrategy } from "../../plugins/resource/bot/languageStrategy";
import { Messages } from "../../plugins/resource/bot/resources/messages";
import { ConfigNames } from "../../plugins/resource/bot/resources/strings";
import {
  CheckThrowSomethingMissing,
  PackDirectoryExistenceError,
  PreconditionError,
} from "../../plugins/resource/bot/v3/error";
import * as utils from "../../plugins/resource/bot/utils/common";
import {
  DeployConfigs,
  FolderNames,
  ProgressBarConstants,
} from "../../plugins/resource/bot/constants";
import * as appService from "@azure/arm-appservice";
import { AzureOperations } from "../../common/azure-hosting/azureOps";
import { AzureUploadConfig } from "../../common/azure-hosting/interfaces";
import { getZipDeployEndpoint } from "../../plugins/resource/bot/utils/zipDeploy";
import { ProgressBarFactory } from "../../plugins/resource/bot/progressBars";
@Service("azure-web-app")
export class AzureWebAppResource implements CloudResource {
  readonly name = "azure-web-app";
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
  };
  readonly finalOutputKeys = ["resourceId", "endpoint"];
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app.generateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const bicep: Bicep = {
          type: "bicep",
          Provision: {
            Modules: { azureWebApp: "1" },
            Orchestration: "1",
          },
          Parameters: {},
        };
        return ok([bicep]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const pmPath = path.join(
          getTemplatesFolder(),
          "bicep",
          "azureWebApp.provision.module.bicep"
        );
        const poPath = path.join(
          getTemplatesFolder(),
          "bicep",
          "azureWebApp.provision.orchestration.bicep"
        );
        const provisionModule = await fs.readFile(pmPath, "utf-8");
        const ProvisionOrch = await fs.readFile(poPath, "utf-8");
        const bicep: Bicep = {
          type: "bicep",
          Provision: {
            Modules: { azureWebApp: provisionModule },
            Orchestration: ProvisionOrch,
          },
          Parameters: await fs.readJson(
            path.join(getTemplatesFolder(), "bicep", "azureWebApp.parameters.json")
          ),
        };
        return ok([bicep]);
      },
    };
    return ok(action);
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
            remarks: `deploy azure web app in folder: ${path.join(
              inputs.projectPath,
              inputs["azure-web-app"].folder
            )}`,
          },
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        ctx.logProvider.info(Messages.DeployingBot);
        // Preconditions checking.
        const workingDir = inputs.folder;
        if (!workingDir) {
          throw new PreconditionError(Messages.WorkingDirIsMissing, []);
        }
        const packDirExisted = await fs.pathExists(workingDir);
        if (!packDirExisted) {
          throw new PackDirectoryExistenceError();
        }

        const botConfig = ctx.envInfo.state[this.name];
        const programmingLanguage = ctx.projectSetting.programmingLanguage;
        CheckThrowSomethingMissing(this.outputs.endpoint.key, botConfig[this.outputs.endpoint.key]);
        CheckThrowSomethingMissing(ConfigNames.PROGRAMMING_LANGUAGE, programmingLanguage);
        CheckThrowSomethingMissing(
          this.outputs.resourceId.key,
          botConfig[this.outputs.resourceId.key]
        );
        const resourceId = botConfig[this.outputs.resourceId.key];
        const subscriptionId = getSubscriptionIdFromResourceId(resourceId);
        const resourceGroup = getResourceGroupNameFromResourceId(resourceId);
        const siteName = getSiteNameFromResourceId(resourceId);

        CheckThrowSomethingMissing(ConfigNames.SUBSCRIPTION_ID, subscriptionId);
        CheckThrowSomethingMissing(ConfigNames.RESOURCE_GROUP, resourceGroup);

        const deployTimeCandidate = Date.now();
        const deployMgr = new DeployMgr(workingDir, ctx.envInfo.envName);
        await deployMgr.init();

        if (!(await deployMgr.needsToRedeploy())) {
          ctx.logProvider.debug(Messages.SkipDeployNoUpdates);
          return ok([]);
        }

        const handler = await ProgressBarFactory.newProgressBar(
          ProgressBarConstants.DEPLOY_TITLE,
          2,
          ctx
        );
        await handler?.start(ProgressBarConstants.DEPLOY_STEP_START);
        await handler?.next(ProgressBarConstants.DEPLOY_STEP_ZIP_FOLDER);
        const unPackFlag = (ctx.envInfo.config as EnvConfig).bot?.unPackFlag as string;
        await LanguageStrategy.localBuild(
          programmingLanguage as ProgrammingLanguage,
          workingDir,
          unPackFlag === "false" ? false : true
        );

        const zipBuffer = utils.zipAFolder(workingDir, DeployConfigs.UN_PACK_DIRS, [
          `${FolderNames.NODE_MODULES}/${FolderNames.KEYTAR}`,
        ]);

        // 2.2 Retrieve publishing credentials.
        const serviceClientCredentials =
          await ctx.tokenProvider.azureAccountProvider.getAccountCredentialAsync();
        if (!serviceClientCredentials) {
          throw new PreconditionError(Messages.FailToGetAzureCreds, [Messages.TryLoginAzure]);
        }
        const webSiteMgmtClient = new appService.WebSiteManagementClient(
          serviceClientCredentials,
          subscriptionId!
        );
        const listResponse = await AzureOperations.listPublishingCredentials(
          webSiteMgmtClient,
          resourceGroup!,
          siteName!
        );

        const publishingUserName = listResponse.publishingUserName ?? "";
        const publishingPassword = listResponse.publishingPassword ?? "";
        const encryptedCreds: string = utils.toBase64(
          `${publishingUserName}:${publishingPassword}`
        );

        const config = {
          headers: {
            Authorization: `Basic ${encryptedCreds}`,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        } as AzureUploadConfig;

        const zipDeployEndpoint: string = getZipDeployEndpoint(botConfig.siteName);
        await handler?.next(ProgressBarConstants.DEPLOY_STEP_ZIP_DEPLOY);
        const statusUrl = await AzureOperations.zipDeployPackage(
          zipDeployEndpoint,
          zipBuffer,
          config
        );
        await AzureOperations.checkDeployStatus(statusUrl, config);

        await deployMgr.updateLastDeployTime(deployTimeCandidate);

        await handler?.end(true);

        ctx.logProvider.info(Messages.SuccessfullyDeployedBot);

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
    };
    return ok(action);
  }
}
