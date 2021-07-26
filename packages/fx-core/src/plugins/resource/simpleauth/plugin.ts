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
import { ScaffoldArmTemplateResult } from "../../../common/armInterface";
import { generateBicepFiles } from "../../../common";

export class SimpleAuthPluginImpl {
  webAppClient!: WebAppClient;

  public async localDebug(ctx: PluginContext): Promise<Result<any, FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartLocalDebug);

    const simpleAuthFilePath = Utils.getSimpleAuthFilePath();
    ctx.config.set(Constants.SimpleAuthPlugin.configKeys.filePath, simpleAuthFilePath);
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

    ctx.config.set(
      Constants.SimpleAuthPlugin.configKeys.environmentVariableParams,
      configArray.join(" ")
    );

    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndPostLocalDebug);
    return ResultFactory.Success();
  }

  public async provision(ctx: PluginContext): Promise<Result<any, FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartProvision);

    const credentials = await ctx.azureAccountProvider!.getAccountCredentialAsync();

    if (!credentials) {
      throw ResultFactory.SystemError(UnauthenticatedError.name, UnauthenticatedError.message());
    }

    const resourceNameSuffix = Utils.getConfigValueWithValidation(
      ctx,
      Constants.SolutionPlugin.id,
      Constants.SolutionPlugin.configKeys.resourceNameSuffix
    ) as string;
    const subscriptionInfo = await ctx.azureAccountProvider?.getSelectedSubscription();
    if (!subscriptionInfo) {
      throw ResultFactory.SystemError(
        NoConfigError.name,
        NoConfigError.message(
          Constants.SolutionPlugin.id,
          Constants.SolutionPlugin.configKeys.subscriptionId
        )
      );
    }
    const subscriptionId = subscriptionInfo!.subscriptionId;
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

    const webAppName = Utils.generateResourceName(ctx.projectSettings!.appName, resourceNameSuffix);
    const appServicePlanName = webAppName;

    this.webAppClient = new WebAppClient(
      credentials,
      subscriptionId,
      resourceGroupName,
      appServicePlanName,
      webAppName,
      location,
      ctx
    );

    DialogUtils.progressBar = ctx.ui?.createProgressBar(Constants.ProgressBar.provision.title, 3);
    await DialogUtils.progressBar?.start(Constants.ProgressBar.start);

    const webApp = await this.webAppClient.createWebApp();

    await DialogUtils.progressBar?.next(Constants.ProgressBar.provision.zipDeploy);
    const simpleAuthFilePath = Utils.getSimpleAuthFilePath();
    await Utils.downloadZip(simpleAuthFilePath);
    await this.webAppClient.zipDeploy(simpleAuthFilePath);

    ctx.config.set(Constants.SimpleAuthPlugin.configKeys.endpoint, webApp.endpoint);

    await DialogUtils.progressBar?.end();

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
      1
    );
    await DialogUtils.progressBar?.start(Constants.ProgressBar.start);
    await DialogUtils.progressBar?.next(Constants.ProgressBar.postProvision.updateWebApp);

    const configs = Utils.getWebAppConfig(ctx, false);

    await this.webAppClient.configWebApp(configs);

    await DialogUtils.progressBar?.end();

    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndPostProvision);
    return ResultFactory.Success();
  }

  public async generateArmTemplates(
    ctx: PluginContext
  ): Promise<Result<ScaffoldArmTemplateResult, FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartGenerateArmTemplates);

    const selectedPlugins = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      .activeResourcePlugins;
    const context = {
      plugins: selectedPlugins,
    };

    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "simpleauth",
      "bicep"
    );

    const moduleTemplateFilePath = path.join(
      bicepTemplateDirectory,
      Constants.moduleTemplateFileName
    );
    const moduleContentResult = await generateBicepFiles(moduleTemplateFilePath, context);
    if (moduleContentResult.isErr()) {
      throw moduleContentResult.error;
    }

    const parameterTemplateFilePath = path.join(
      bicepTemplateDirectory,
      Constants.inputParameterOrchestrationFileName
    );
    const resourceTemplateFilePath = path.join(
      bicepTemplateDirectory,
      Constants.moduleOrchestrationFileName
    );
    const outputTemplateFilePath = path.join(
      bicepTemplateDirectory,
      Constants.outputOrchestrationFileName
    );

    const result: ScaffoldArmTemplateResult = {
      Modules: {
        simpleAuthProvision: {
          Content: moduleContentResult.value,
        },
      },
      Orchestration: {
        ParameterTemplate: {
          Content: await fs.readFile(parameterTemplateFilePath, "utf-8"),
        },
        ModuleTemplate: {
          Content: await fs.readFile(resourceTemplateFilePath, "utf-8"),
          Outputs: {
            skuName: Constants.SimpleAuthBicepOutputSkuName,
            endpoint: Constants.SimpleAuthBicepOutputEndpoint,
          },
        },
        OutputTemplate: {
          Content: await fs.readFile(outputTemplateFilePath, "utf-8"),
        },
      },
    };

    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndGenerateArmTemplates);
    return ResultFactory.Success(result);
  }
}
