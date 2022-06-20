// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import { LanguageStrategy } from "../languageStrategy";
import { Messages } from "../resources/messages";
import { FxResult, FxBotPluginResultFactory as ResultFactory } from "../result";
import { BotBicep, PathInfo, ProgressBarConstants, TemplateProjectsConstants } from "../constants";

import { PluginBot } from "../resources/strings";
import { PreconditionError, SomethingMissingError } from "../errors";
import { ProgressBarFactory } from "../progressBars";
import { Logger } from "../logger";
import { TeamsBotImpl } from "../plugin";
import { getActivatedV2ResourcePlugins } from "../../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../../solution/fx-solution/v2/adaptor";
import * as path from "path";
import * as fs from "fs-extra";
import { getTemplatesFolder } from "../../../../folder";
import { Bicep, ConstantString } from "../../../../common/constants";
import {
  generateBicepFromFile,
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../../common";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { FuncHostedDeployMgr } from "./deployMgr";
import * as appService from "@azure/arm-appservice";
import { getZipDeployEndpoint } from "../utils/zipDeploy";
import * as utils from "../utils/common";
import { AzureOperations } from "../../../../common/azure-hosting/azureOps";
import {
  AzureOperationCommonConstants,
  DeployConfigsConstants,
} from "../../../../common/azure-hosting/hostingConstant";
import { HostType } from "../v2/enum";

export class FunctionsHostedBotImpl extends TeamsBotImpl {
  public async scaffold(context: PluginContext): Promise<FxResult> {
    this.ctx = context;

    await this.config.restoreConfigFromContext(context, true);
    this.config.scaffold.hostType = HostType.Functions;

    Logger.info(Messages.ScaffoldingBot);

    // title must match closeProgressBar in bot/index.ts::scaffold()
    const handler = await ProgressBarFactory.newProgressBar(
      ProgressBarConstants.SCAFFOLD_TITLE,
      ProgressBarConstants.SCAFFOLD_FUNCTIONS_NOTIFICATION_STEPS_NUM,
      this.ctx
    );
    await handler?.start(ProgressBarConstants.SCAFFOLD_FUNCTIONS_NOTIFICATION_STEP_START);

    // 1. Copy the corresponding template project into target directory.
    const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;
    if (!this.config.actRoles) {
      throw new SomethingMissingError("act roles");
    }

    await handler?.next(
      ProgressBarConstants.SCAFFOLD_FUNCTIONS_NOTIFICATION_STEP_FETCH_PROJECT_TEMPLATE
    );
    await LanguageStrategy.scaffoldProject(group_name, this.config);

    // 2. Copy the trigger template(s) into the trigger directories.
    // For example,
    //  templates/bot/ts/notification-trigger-http ==> ${projectRoot}/notifyHttpTrigger
    await handler?.next(
      ProgressBarConstants.SCAFFOLD_FUNCTIONS_NOTIFICATION_STEP_FETCH_TRIGGER_TEMPLATE
    );
    await LanguageStrategy.scaffoldTriggers(group_name, this.config);

    this.config.saveConfigIntoContext(context);
    Logger.info(Messages.SuccessfullyScaffoldedBot);

    return ResultFactory.Success();
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<FxResult> {
    Logger.info(Messages.GeneratingArmTemplatesBot);
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const bicepTemplateDir = path.join(getTemplatesFolder(), PathInfo.BicepTemplateRelativeDir);
    const provisionOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDir, Bicep.ProvisionFileName),
      pluginCtx
    );
    const provisionModules = await generateBicepFromFile(
      path.join(bicepTemplateDir, PathInfo.FuncHostedProvisionModuleTemplateFileName),
      pluginCtx
    );
    const configOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDir, Bicep.ConfigFileName),
      pluginCtx
    );
    const configModule = await generateBicepFromFile(
      path.join(bicepTemplateDir, PathInfo.ConfigurationModuleTemplateFileName),
      pluginCtx
    );
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { bot: provisionModules },
      },
      Configuration: {
        Orchestration: configOrchestration,
        Modules: { bot: configModule },
      },
      Reference: {
        resourceId: BotBicep.resourceId,
        hostName: BotBicep.hostName,
        webAppEndpoint: BotBicep.webAppEndpoint,
      },
      Parameters: JSON.parse(
        await fs.readFile(
          path.join(bicepTemplateDir, Bicep.ParameterFileName),
          ConstantString.UTF8Encoding
        )
      ),
    };

    Logger.info(Messages.SuccessfullyGenerateArmTemplatesBot);
    return ResultFactory.Success(result);
  }

  public async deploy(context: PluginContext): Promise<FxResult> {
    this.ctx = context;
    await this.config.restoreConfigFromContext(context);

    this.config.provision.subscriptionId = getSubscriptionIdFromResourceId(
      this.config.provision.botWebAppResourceId!
    );
    this.config.provision.resourceGroup = getResourceGroupNameFromResourceId(
      this.config.provision.botWebAppResourceId!
    );
    this.config.provision.siteName = getSiteNameFromResourceId(
      this.config.provision.botWebAppResourceId!
    );

    Logger.info(Messages.DeployingBot);

    const workingDir = this.config.scaffold.workingDir;
    if (!workingDir) {
      throw new PreconditionError(Messages.WorkingDirIsMissing, []);
    }

    const programmingLanguage = this.config.scaffold.programmingLanguage;
    if (!programmingLanguage) {
      throw new PreconditionError(Messages.SomethingIsMissing(PluginBot.PROGRAMMING_LANGUAGE), []);
    }

    const deployMgr = new FuncHostedDeployMgr(workingDir, this.ctx.envInfo.envName);
    const needsToRedeploy: boolean = await deployMgr.needsToRedeploy();
    if (!needsToRedeploy) {
      Logger.debug(Messages.SkipDeployNoUpdates);
      return ResultFactory.Success();
    }

    const handler = await ProgressBarFactory.newProgressBar(
      ProgressBarConstants.DEPLOY_TITLE,
      ProgressBarConstants.DEPLOY_STEPS_NUM,
      this.ctx
    );

    await handler?.start(ProgressBarConstants.DEPLOY_STEP_START);

    await handler?.next(ProgressBarConstants.DEPLOY_STEP_NPM_INSTALL);
    await LanguageStrategy.localBuild(programmingLanguage, workingDir);

    await handler?.next(ProgressBarConstants.DEPLOY_STEP_ZIP_FOLDER);
    const deployTime: Date = new Date();
    const rules = await deployMgr.getIgnoreRules(DeployConfigsConstants.FUNC_IGNORE_FILE);
    const zipBuffer = await deployMgr.zipAFolder(rules);

    // 2.2 Retrieve publishing credentials.
    const webSiteMgmtClient = new appService.WebSiteManagementClient(
      await this.getAzureAccountCredential(),
      this.config.provision.subscriptionId!
    );
    const listResponse = await AzureOperations.listPublishingCredentials(
      webSiteMgmtClient,
      this.config.provision.resourceGroup!,
      this.config.provision.siteName!
    );

    const publishingUserName = listResponse.publishingUserName ?? "";
    const publishingPassword = listResponse.publishingPassword ?? "";
    const encryptedCreds: string = utils.toBase64(`${publishingUserName}:${publishingPassword}`);

    const config = {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-cache",
        Authorization: `Basic ${encryptedCreds}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: AzureOperationCommonConstants.deployTimeoutInMs,
    };

    const zipDeployEndpoint: string = getZipDeployEndpoint(this.config.provision.siteName!);
    await handler?.next(ProgressBarConstants.DEPLOY_STEP_ZIP_DEPLOY);
    const statusUrl = await AzureOperations.zipDeployPackage(zipDeployEndpoint, zipBuffer, config);
    await AzureOperations.checkDeployStatus(statusUrl, config);

    await AzureOperations.restartWebApp(
      webSiteMgmtClient,
      this.config.provision.resourceGroup,
      this.config.provision.siteName
    );
    await deployMgr.saveDeploymentInfo(zipBuffer, deployTime);

    this.config.saveConfigIntoContext(context);
    Logger.info(Messages.SuccessfullyDeployedBot);

    return ResultFactory.Success();
  }
}
