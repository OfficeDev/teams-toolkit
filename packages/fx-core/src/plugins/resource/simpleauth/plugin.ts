// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { err, FunctionGroupTask, FxError, ok, PluginContext, Result } from "@microsoft/teamsfx-api";
import { Constants, Messages } from "./constants";
import { UnauthenticatedError } from "./errors";
import { ResultFactory } from "./result";
import { Utils } from "./utils/common";
import { DialogUtils } from "./utils/dialog";
import { TelemetryUtils } from "./utils/telemetry";
import { WebAppClient } from "./webAppClient";

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
    const task1 = async (): Promise<Result<undefined, Error>> => {
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
  
      const webAppName = Utils.generateResourceName(ctx.app.name.short, resourceNameSuffix);
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
      return ok(undefined);
    };

    let endpoint:string;

    const task2 = async (): Promise<Result<undefined, Error>> => {
      await this.webAppClient.createAppServicePlan();
      return ok(undefined);
    }
    const task3 = async (): Promise<Result<undefined, Error>> => {
      endpoint = await this.webAppClient.createWebApp();
      return ok(undefined);
    }
    const task4 = async (): Promise<Result<undefined, Error>> => {
      const simpleAuthFilePath = Utils.getSimpleAuthFilePath();
      await Utils.downloadZip(simpleAuthFilePath);
      await this.webAppClient.zipDeploy(simpleAuthFilePath);
      ctx.config.set(Constants.SimpleAuthPlugin.configKeys.endpoint, endpoint);
      Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndProvision);
      return ok(undefined);
    }
    const group = new FunctionGroupTask({
      name:Constants.ProgressBar.provision.title,
      tasks:[task1,task2,task3,task4],
      taskNames:[
        "Initializing",
        Constants.ProgressBar.provision.createAppServicePlan,
        Constants.ProgressBar.provision.createWebApp,
        Constants.ProgressBar.provision.zipDeploy
      ], 
      cancelable:true,
      concurrent: false,
      fastFail: true
    });
    const res = (await ctx.ui?.runWithProgress(group)) as Result<any, FxError>;
    if(res.isOk()) return ok(undefined);
    else return err(res.error);
  }

  public async postProvision(ctx: PluginContext): Promise<Result<any, FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartPostProvision);

    DialogUtils.progressBar = ctx.dialog?.createProgressBar(
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
}
