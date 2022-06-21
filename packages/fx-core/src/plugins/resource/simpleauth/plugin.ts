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
import { getTemplatesFolder } from "../../../folder";
import { ArmTemplateResult } from "../../../common/armInterface";
import { LocalSettingsSimpleAuthKeys } from "../../../common/localSettingsConstants";
import { Bicep, ConstantString } from "../../../common/constants";
import { getActivatedV2ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../solution/fx-solution/v2/adaptor";
import { generateBicepFromFile, isConfigUnifyEnabled } from "../../../common/tools";
import { LocalStateSimpleAuthKeys } from "../../../common/localStateConstants";
export class SimpleAuthPluginImpl {
  webAppClient!: WebAppClient;

  public async localDebug(ctx: PluginContext): Promise<Result<any, FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartLocalDebug);

    const simpleAuthFilePath = Utils.getSimpleAuthFilePath();
    if (isConfigUnifyEnabled()) {
      ctx.envInfo.state
        .get(Constants.SimpleAuthPlugin.id)
        ?.set(LocalSettingsSimpleAuthKeys.SimpleAuthFilePath, simpleAuthFilePath);
    } else {
      ctx.localSettings?.auth?.set(
        LocalSettingsSimpleAuthKeys.SimpleAuthFilePath,
        simpleAuthFilePath
      );
    }

    await Utils.downloadZip(simpleAuthFilePath);

    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndLocalDebug);
    return ResultFactory.Success();
  }

  public async postLocalDebug(ctx: PluginContext): Promise<Result<any, FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartPostLocalDebug);

    let configs: any;
    if (isConfigUnifyEnabled()) {
      configs = Utils.getWebAppConfig(ctx, false);
    } else {
      configs = Utils.getWebAppConfig(ctx, true);
    }

    const configArray = [];
    for (const [key, value] of Object.entries(configs)) {
      configArray.push(`${key}="${value}"`);
    }

    if (isConfigUnifyEnabled()) {
      ctx.envInfo.state
        .get(Constants.SimpleAuthPlugin.id)
        ?.set(LocalStateSimpleAuthKeys.EnvironmentVariableParams, configArray.join(" "));
    } else {
      ctx.localSettings?.auth?.set(
        LocalSettingsSimpleAuthKeys.SimpleAuthEnvironmentVariableParams,
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

    await DialogUtils.progressBar?.end(true);

    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndPostProvision);
    return ResultFactory.Success();
  }

  public async updateArmTemplates(ctx: PluginContext): Promise<Result<ArmTemplateResult, FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartUpdateArmTemplates);
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };

    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "simpleauth",
      "bicep"
    );

    const configModuleFilePath = path.join(
      bicepTemplateDirectory,
      Constants.configModuleTemplateFileName
    );
    const configModules = await generateBicepFromFile(configModuleFilePath, pluginCtx);
    const result: ArmTemplateResult = {
      Reference: {
        skuName: Constants.SimpleAuthBicepOutputSkuName,
        endpoint: Constants.SimpleAuthBicepOutputEndpoint,
      },
      Configuration: {
        Modules: { simpleAuth: configModules },
      },
    };

    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndUpdateArmTemplates);
    return ResultFactory.Success(result);
  }

  public async generateArmTemplates(
    ctx: PluginContext
  ): Promise<Result<ArmTemplateResult, FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartGenerateArmTemplates);
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "simpleauth",
      "bicep"
    );

    const provisionModuleResult = path.join(
      bicepTemplateDirectory,
      Constants.provisionModuleTemplateFileName
    );
    const configModuleFilePath = path.join(
      bicepTemplateDirectory,
      Constants.configModuleTemplateFileName
    );
    const provisionOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDirectory, Bicep.ProvisionFileName),
      pluginCtx
    );
    const provisionModules = await generateBicepFromFile(provisionModuleResult, pluginCtx);
    const configOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDirectory, Bicep.ConfigFileName),
      pluginCtx
    );
    const configModule = await generateBicepFromFile(configModuleFilePath, pluginCtx);
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { simpleAuth: provisionModules },
      },
      Configuration: {
        Orchestration: configOrchestration,
        Modules: { simpleAuth: configModule },
      },
      Reference: {
        skuName: Constants.SimpleAuthBicepOutputSkuName,
        endpoint: Constants.SimpleAuthBicepOutputEndpoint,
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

    const webAppName = Utils.generateResourceName(ctx.projectSettings!.appName, resourceNameSuffix); // appName will be normalized in generateResourceName(), so we don't do any conversion here.
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
  }
}
