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
  InvalidStorageNameError,
  StorageAccountAlreadyTakenError,
  runWithErrorCatchAndWrap,
  RegisterResourceProviderError,
} from "./resources/errors";
import {
  AzureErrorCode,
  AzureInfo,
  Constants,
  DependentPluginInfo,
  FrontendOutputBicepSnippet,
  FrontendPathInfo,
  FrontendPluginInfo as PluginInfo,
  RegularExpr,
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
import { AzureClientFactory, AzureLib } from "./utils/azure-client";
import { getTemplatesFolder } from "../../..";
import { ScaffoldArmTemplateResult } from "../../../common/armInterface";
import * as fs from "fs-extra";

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
            filePath.replace(RegularExpr.ReplaceTemplateExt, Constants.EmptyString),
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
    const provider = AzureClientFactory.getResourceProviderClient(
      config.credentials,
      config.subscriptionId
    );
    const client = new AzureStorageClient(config);

    await progressHandler?.next(ProvisionSteps.RegisterResourceProvider);
    await runWithErrorCatchAndThrow(
      new RegisterResourceProviderError(),
      async () =>
        await AzureLib.ensureResourceProviders(provider, AzureInfo.RequiredResourceProviders)
    );

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
      return new CreateStorageAccountError(innerError.code);
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

  public async generateArmTemplates(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartGenerateArmTemplates(PluginInfo.DisplayName));

    const bicepTemplateDir = path.join(
      getTemplatesFolder(),
      FrontendPathInfo.TemplateDir,
      FrontendPathInfo.bicepTemplateFolderName
    );

    const moduleFilePath = path.join(bicepTemplateDir, FrontendPathInfo.moduleFileName);

    const inputParameterOrchestrationFilePath = path.join(
      bicepTemplateDir,
      FrontendPathInfo.inputParameterOrchestrationFileName
    );
    const moduleOrchestrationFilePath = path.join(
      bicepTemplateDir,
      FrontendPathInfo.moduleOrchestrationFileName
    );
    const outputOrchestrationFilePath = path.join(
      bicepTemplateDir,
      FrontendPathInfo.outputOrchestrationFileName
    );

    const result: ScaffoldArmTemplateResult = {
      Modules: {
        frontendHostingProvision: {
          Content: await fs.readFile(moduleFilePath, "utf-8"),
        },
      },
      Orchestration: {
        ParameterTemplate: {
          Content: await fs.readFile(inputParameterOrchestrationFilePath, "utf-8"),
        },
        ModuleTemplate: {
          Content: await fs.readFile(moduleOrchestrationFilePath, "utf-8"),
          Outputs: {
            storageName: FrontendOutputBicepSnippet.StorageName,
            endpoint: FrontendOutputBicepSnippet.Endpoint,
            domain: FrontendOutputBicepSnippet.Domain,
          },
        },
        OutputTemplate: {
          Content: await fs.readFile(outputOrchestrationFilePath, "utf-8"),
        },
      },
    };

    return ok(result);
  }
}
