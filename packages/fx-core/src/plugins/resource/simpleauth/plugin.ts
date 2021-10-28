// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AzureSolutionSettings, FxError, PluginContext, Result } from "@microsoft/teamsfx-api";
import { Constants, Messages, Telemetry } from "./constants";
import { NoConfigError, UnauthenticatedError } from "./errors";
import { ResultFactory } from "./result";
import { Utils } from "./utils/common";
import { DialogUtils } from "./utils/dialog";
import { TelemetryUtils } from "./utils/telemetry";
import { WebAppClient } from "./webAppClient";
import * as path from "path";
import * as fs from "fs-extra";
import { getTemplatesFolder } from "../../..";
import { ScaffoldArmTemplateResult, ArmTemplateResult } from "../../../common/armInterface";
import { generateBicepFiles, isArmSupportEnabled, isMultiEnvEnabled } from "../../../common";
import { getArmOutput } from "../utils4v2";
import { LocalSettingsAuthKeys } from "../../../common/localSettingsConstants";
import { Bicep, ConstantString } from "../../../common/constants";

export class SimpleAuthPluginImpl {
  webAppClient!: WebAppClient;

  public async localDebug(ctx: PluginContext): Promise<Result<any, FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartLocalDebug);

    const simpleAuthFilePath = Utils.getSimpleAuthFilePath();
    if (isMultiEnvEnabled()) {
      ctx.localSettings?.auth?.set(LocalSettingsAuthKeys.SimpleAuthFilePath, simpleAuthFilePath);
    } else {
      ctx.config.set(Constants.SimpleAuthPlugin.configKeys.filePath, simpleAuthFilePath);
    }

    await Utils.downloadZip(simpleAuthFilePath);

    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndLocalDebug);
    return ResultFactory.Success();
  }

  public async postLocalDebug(ctx: PluginContext): Promise<Result<any, FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartPostLocalDebug);

    const configs = Utils.getWebAppConfig(ctx, true);

    const configArray = [];
    for (const [key, value] of Object.entries(configs)) {
      configArray.push(`${key}="${value}"`);
    }

    if (isMultiEnvEnabled()) {
      ctx.localSettings?.auth?.set(
        LocalSettingsAuthKeys.SimpleAuthEnvironmentVariableParams,
        configArray.join(" ")
      );
    } else {
      ctx.config.set(
        Constants.SimpleAuthPlugin.configKeys.environmentVariableParams,
        configArray.join(" ")
      );
    }

    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndPostLocalDebug);
    return ResultFactory.Success();
  }

  public async provision(ctx: PluginContext): Promise<Result<any, FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartProvision);

    await this.initWebAppClient(ctx);

    DialogUtils.progressBar = ctx.ui?.createProgressBar(
      Constants.ProgressBar.provision.title,
      Object.keys(Constants.ProgressBar.provision).length - 1
    );
    await DialogUtils.progressBar?.start(Constants.ProgressBar.start);

    const webApp = await this.webAppClient.createWebApp();

    await DialogUtils.progressBar?.next(Constants.ProgressBar.provision.zipDeploy);
    const simpleAuthFilePath = Utils.getSimpleAuthFilePath();
    await Utils.downloadZip(simpleAuthFilePath);
    await this.webAppClient.zipDeploy(simpleAuthFilePath);

    ctx.config.set(Constants.SimpleAuthPlugin.configKeys.endpoint, webApp.endpoint);

    await DialogUtils.progressBar?.end(true);

    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndProvision, {
      [Telemetry.skuName]: webApp.skuName,
    });
    return ResultFactory.Success();
  }

  public async postProvision(ctx: PluginContext): Promise<Result<any, FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartPostProvision);

    DialogUtils.progressBar = ctx.ui?.createProgressBar(
      Constants.ProgressBar.postProvision.title,
      Object.keys(Constants.ProgressBar.postProvision).length - 1
    );
    await DialogUtils.progressBar?.start(Constants.ProgressBar.start);
    await DialogUtils.progressBar?.next(Constants.ProgressBar.postProvision.updateWebApp);

    const configs = Utils.getWebAppConfig(ctx, false);

    if (isArmSupportEnabled()) {
      const endpoint = getArmOutput(ctx, Constants.ArmOutput.simpleAuthEndpoint) as string;
      ctx.config.set(Constants.SimpleAuthPlugin.configKeys.endpoint, endpoint);

      const sku = getArmOutput(ctx, Constants.ArmOutput.simpleAuthSkuName) as string;
      if (sku) {
        ctx.config.set(Constants.SimpleAuthPlugin.configKeys.skuName, sku);
      }
    } else {
      await this.webAppClient.configWebApp(configs);
    }

    await DialogUtils.progressBar?.end(true);

    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndPostProvision);
    return ResultFactory.Success();
  }

  public async generateArmTemplates(
    ctx: PluginContext
  ): Promise<Result<ArmTemplateResult, FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartGenerateArmTemplates);

    const selectedPlugins = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      .activeResourcePlugins;
    const context = {
      Plugins: selectedPlugins,
    };
    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "simpleauth",
      "bicep"
    );

    const provisionModuleV2Result = path.join(
      bicepTemplateDirectory,
      Constants.provisionModuleTemplateFileNameV2
    );
    const configModuleV2FilePath = path.join(
      bicepTemplateDirectory,
      Constants.configModuleTemplateFileNameV2
    );

    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: await fs.readFile(
          path.join(bicepTemplateDirectory, Bicep.ProvisionV2FileName),
          ConstantString.UTF8Encoding
        ),
        Reference: {
          skuName: Constants.SimpleAuthBicepOutputSkuName,
          endpoint: Constants.SimpleAuthBicepOutputEndpoint,
        },
        Modules: {
          simpleAuthProvision: await fs.readFile(
            provisionModuleV2Result,
            ConstantString.UTF8Encoding
          ),
        },
      },
      Configuration: {
        Orchestration: await fs.readFile(
          path.join(bicepTemplateDirectory, Bicep.ConfigV2FileName),
          ConstantString.UTF8Encoding
        ),
        Modules: {
          simpleAuthConfiguration: await fs.readFile(
            configModuleV2FilePath,
            ConstantString.UTF8Encoding
          ),
        },
      },
    };

    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndGenerateArmTemplates);
    return ResultFactory.Success(result);
  }

  private async initWebAppClient(ctx: PluginContext) {
    const credentials = await ctx.azureAccountProvider!.getAccountCredentialAsync();

    if (!credentials) {
      throw ResultFactory.SystemError(UnauthenticatedError.name, UnauthenticatedError.message());
    }

    const resourceNameSuffix = Utils.getConfigValueWithValidation(
      ctx,
      Constants.SolutionPlugin.id,
      Constants.SolutionPlugin.configKeys.resourceNameSuffix
    ) as string;
    const subscriptionId = Utils.getConfigValueWithValidation(
      ctx,
      Constants.SolutionPlugin.id,
      Constants.SolutionPlugin.configKeys.subscriptionId
    ) as string;
    const resourceGroupName = Utils.getConfigValueWithValidation(
      ctx,
      Constants.SolutionPlugin.id,
      Constants.SolutionPlugin.configKeys.resourceGroupName
    ) as string;
    const location = Utils.getConfigValueWithValidation(
      ctx,
      Constants.SolutionPlugin.id,
      Constants.SolutionPlugin.configKeys.location
    ) as string;

    let webAppName: string;
    let appServicePlanName: string;
    if (isArmSupportEnabled()) {
      webAppName = getArmOutput(ctx, Constants.ArmOutput.simpleAuthWebAppName) as string;
      appServicePlanName = getArmOutput(
        ctx,
        Constants.ArmOutput.simpleAuthAppServicePlanName
      ) as string;
    } else {
      webAppName = Utils.generateResourceName(ctx.projectSettings!.appName, resourceNameSuffix);
      appServicePlanName = webAppName;
    }

    this.webAppClient = new WebAppClient(
      credentials,
      subscriptionId,
      resourceGroupName,
      appServicePlanName,
      webAppName,
      location,
      ctx
    );
  }
}
