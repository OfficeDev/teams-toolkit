// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext, ok } from "@microsoft/teamsfx-api";
import path from "path";

import { AzureStorageClient } from "./clients";
import {
  CreateStorageAccountError,
  EnableStaticWebsiteError,
  GetTemplateError,
  NoResourceGroupError,
  NoStorageError,
  StaticWebsiteDisabledError,
  UnzipTemplateError,
  runWithErrorCatchAndThrow,
  CheckStorageError,
  CheckResourceGroupError,
  NoPreStepError,
  InvalidStorageNameError,
  StorageAccountAlreadyTakenError,
  runWithErrorCatchAndWrap,
} from "./resources/errors";
import {
  AzureErrorCode,
  Constants,
  DependentPluginInfo,
  FrontendConfigInfo,
  FrontendPathInfo,
  FrontendPluginInfo as PluginInfo,
} from "./constants";
import { FrontendConfig } from "./configs";
import { FrontendDeployment } from "./ops/deploy";
import {
  AADEnvironment,
  FrontendProvision,
  FunctionEnvironment,
  RuntimeEnvironment,
} from "./ops/provision";
import { Logger } from "./utils/logger";
import { Messages } from "./resources/messages";
import { FrontendScaffold as Scaffold } from "./ops/scaffold";
import { TeamsFxResult } from "./error-factory";
import {
  PreDeploySteps,
  ProgressHelper,
  ProvisionSteps,
  ScaffoldSteps,
} from "./utils/progress-helper";
import { TemplateInfo } from "./resources/templateInfo";

export class FrontendPluginImpl {
  private setConfigIfNotExists(ctx: PluginContext, key: string, value: unknown): void {
    if (ctx.config.get(key)) {
      return;
    }
    ctx.config.set(key, value);
  }

  public async scaffold(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartScaffold(PluginInfo.DisplayName));
    const progressHandler = await ProgressHelper.startScaffoldProgressHandler(ctx);
    await progressHandler?.next(ScaffoldSteps.Scaffold);

    const templateInfo = new TemplateInfo(ctx);

    const zip = await runWithErrorCatchAndThrow(
      new GetTemplateError(),
      async () => await Scaffold.getTemplateZip(ctx, templateInfo)
    );
    await runWithErrorCatchAndThrow(
      new UnzipTemplateError(),
      async () =>
        await Scaffold.scaffoldFromZip(
          zip,
          path.join(ctx.root, FrontendPathInfo.WorkingDir),
          (filePath: string, data: Buffer) =>
            filePath.replace(Constants.ReplaceTemplateExt, Constants.EmptyString),
          (filePath: string, data: Buffer) =>
            Scaffold.fulfill(filePath, data, templateInfo.variables)
        )
    );

    await ProgressHelper.endScaffoldProgress();
    Logger.info(Messages.EndScaffold(PluginInfo.DisplayName));
    return ok(undefined);
  }

  public async preProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartPreProvision(PluginInfo.DisplayName));

    const config = await FrontendConfig.fromPluginContext(ctx);
    const azureStorageClient = new AzureStorageClient(config);

    const resourceGroupExists: boolean = await runWithErrorCatchAndThrow(
      new CheckResourceGroupError(),
      async () => await azureStorageClient.doesResourceGroupExists()
    );
    if (!resourceGroupExists) {
      throw new NoResourceGroupError();
    }

    Logger.info(Messages.EndPreProvision(PluginInfo.DisplayName));
    return ok(undefined);
  }

  public async provision(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartProvision(PluginInfo.DisplayName));
    const progressHandler = await ProgressHelper.startProvisionProgressHandler(ctx);

    const config = await FrontendConfig.fromPluginContext(ctx);
    const client = new AzureStorageClient(config);

    await progressHandler?.next(ProvisionSteps.CreateStorage);
    const createStorageErrorWrapper = (innerError: any) => {
      if (innerError.code === AzureErrorCode.ReservedResourceName) {
        return new InvalidStorageNameError();
      }
      if (
        innerError.code === AzureErrorCode.StorageAccountAlreadyTaken ||
        innerError.code === AzureErrorCode.StorageAccountAlreadyExists
      ) {
        return new StorageAccountAlreadyTakenError();
      }
      return new CreateStorageAccountError();
    };
    config.endpoint = await runWithErrorCatchAndWrap(
      createStorageErrorWrapper,
      async () => await client.createStorageAccount()
    );

    await progressHandler?.next(ProvisionSteps.Configure);
    await runWithErrorCatchAndThrow(
      new EnableStaticWebsiteError(),
      async () => await client.enableStaticWebsite()
    );

    config.domain = new URL(config.endpoint).hostname;
    config.syncToPluginContext(ctx);

    await ProgressHelper.endProvisionProgress();
    Logger.info(Messages.EndProvision(PluginInfo.DisplayName));
    return ok(undefined);
  }

  public async postProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    let functionEnv: FunctionEnvironment | undefined;
    let runtimeEnv: RuntimeEnvironment | undefined;
    let aadEnv: AADEnvironment | undefined;

    const functionPlugin = ctx.configOfOtherPlugins.get(DependentPluginInfo.FunctionPluginName);
    if (functionPlugin) {
      functionEnv = {
        defaultName: functionPlugin.get(DependentPluginInfo.FunctionDefaultName) as string,
        endpoint: functionPlugin.get(DependentPluginInfo.FunctionEndpoint) as string,
      };
    }

    const authPlugin = ctx.configOfOtherPlugins.get(DependentPluginInfo.RuntimePluginName);
    if (authPlugin) {
      runtimeEnv = {
        endpoint: authPlugin.get(DependentPluginInfo.RuntimeEndpoint) as string,
        startLoginPageUrl: DependentPluginInfo.StartLoginPageURL,
      };
    }

    const aadPlugin = ctx.configOfOtherPlugins.get(DependentPluginInfo.AADPluginName);
    if (aadPlugin) {
      aadEnv = {
        clientId: aadPlugin.get(DependentPluginInfo.ClientID) as string,
      };
    }

    if (functionEnv || runtimeEnv || aadEnv) {
      await FrontendProvision.setEnvironments(
        path.join(ctx.root, FrontendPathInfo.WorkingDir, FrontendPathInfo.TabEnvironmentFilePath),
        functionEnv,
        runtimeEnv,
        aadEnv
      );
    }

    return ok(undefined);
  }

  public async preDeploy(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartPreDeploy(PluginInfo.DisplayName));
    const progressHandler = await ProgressHelper.createPreDeployProgressHandler(ctx);

    const config = await FrontendConfig.fromPluginContext(ctx);
    const client = new AzureStorageClient(config);

    await progressHandler?.next(PreDeploySteps.CheckStorage);

    const resourceGroupExists: boolean = await runWithErrorCatchAndThrow(
      new CheckResourceGroupError(),
      async () => await client.doesResourceGroupExists()
    );
    if (!resourceGroupExists) {
      throw new NoResourceGroupError();
    }

    const storageExists: boolean = await runWithErrorCatchAndThrow(
      new CheckStorageError(),
      async () => await client.doesStorageAccountExists()
    );
    if (!storageExists) {
      throw new NoStorageError();
    }

    const storageAvailable: boolean | undefined = await runWithErrorCatchAndThrow(
      new CheckStorageError(),
      async () => await client.isStorageStaticWebsiteEnabled()
    );
    if (!storageAvailable) {
      throw new StaticWebsiteDisabledError();
    }

    ProgressHelper.endPreDeployProgress();
    Logger.info(Messages.EndPreDeploy(PluginInfo.DisplayName));
    return ok(undefined);
  }

  public async deploy(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartDeploy(PluginInfo.DisplayName));
    await ProgressHelper.startDeployProgressHandler(ctx);

    const config = await FrontendConfig.fromPluginContext(ctx);
    const client = new AzureStorageClient(config);

    const componentPath: string = path.join(ctx.root, FrontendPathInfo.WorkingDir);

    await FrontendDeployment.doFrontendBuild(componentPath);
    await FrontendDeployment.doFrontendDeployment(client, componentPath);

    await ProgressHelper.endDeployProgress();
    Logger.info(Messages.EndDeploy(PluginInfo.DisplayName));
    return ok(undefined);
  }
}
