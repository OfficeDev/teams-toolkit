// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  PluginContext,
  ok,
  Func,
  ArchiveFolderName,
  ArchiveLogFileName,
  AppPackageFolderName,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import path from "path";

import { AzureStorageClient } from "./clients";
import {
  CreateStorageAccountError,
  EnableStaticWebsiteError,
  NoResourceGroupError,
  NoStorageError,
  StaticWebsiteDisabledError,
  runWithErrorCatchAndThrow,
  CheckStorageError,
  CheckResourceGroupError,
  InvalidStorageNameError,
  StorageAccountAlreadyTakenError,
  runWithErrorCatchAndWrap,
  RegisterResourceProviderError,
  UserTaskNotImplementedError,
  MigrateV1ProjectError,
} from "./resources/errors";
import {
  ArmOutput,
  AzureErrorCode,
  AzureInfo,
  DependentPluginInfo,
  EnvironmentVariables,
  FrontendOutputBicepSnippet,
  FrontendPathInfo,
  FrontendPluginInfo as PluginInfo,
} from "./constants";
import { FrontendConfig } from "./configs";
import { FrontendDeployment } from "./ops/deploy";
import { Logger } from "./utils/logger";
import { Messages } from "./resources/messages";
import { FrontendScaffold as Scaffold } from "./ops/scaffold";
import { TeamsFxResult } from "./error-factory";
import {
  MigrateSteps,
  PreDeploySteps,
  ProgressHelper,
  ProvisionSteps,
  ScaffoldSteps,
} from "./utils/progress-helper";
import { TemplateInfo } from "./resources/templateInfo";
import { AzureClientFactory, AzureLib } from "./utils/azure-client";
import { getArmOutput } from "../utils4v2";
import { getTemplatesFolder, isArmSupportEnabled } from "../../..";
import { ScaffoldArmTemplateResult } from "../../../common/armInterface";
import * as fs from "fs-extra";
import { Bicep, ConstantString } from "../../../common/constants";
import { EnvironmentUtils } from "./utils/environment-utils";
import { copyFiles } from "../../../common";
import { AzureResourceFunction } from "../../solution/fx-solution/question";

export class FrontendPluginImpl {
  public async scaffold(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartScaffold(PluginInfo.DisplayName));
    const progressHandler = await ProgressHelper.startScaffoldProgressHandler(ctx);
    await progressHandler?.next(ScaffoldSteps.Scaffold);

    const templateInfo = new TemplateInfo(ctx);

    await Scaffold.scaffoldFromZipPackage(
      path.join(ctx.root, FrontendPathInfo.WorkingDir),
      templateInfo
    );

    await ProgressHelper.endScaffoldProgress(true);
    Logger.info(Messages.EndScaffold(PluginInfo.DisplayName));
    return ok(undefined);
  }

  public async preProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartPreProvision(PluginInfo.DisplayName));
    await this.ensureResourceGroupExists(
      new AzureStorageClient(await FrontendConfig.fromPluginContext(ctx))
    );
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

    await ProgressHelper.endProvisionProgress(true);
    Logger.info(Messages.EndProvision(PluginInfo.DisplayName));
    return ok(undefined);
  }

  public async postProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    if (isArmSupportEnabled()) {
      await this.syncArmOutput(ctx);
    }

    return ok(undefined);
  }

  public async preDeploy(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartPreDeploy(PluginInfo.DisplayName));
    const progressHandler = await ProgressHelper.createPreDeployProgressHandler(ctx);

    await this.updateDotenv(ctx);

    await progressHandler?.next(PreDeploySteps.CheckStorage);
    await this.checkStorageAvailability(ctx);

    await ProgressHelper.endPreDeployProgress(true);
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

    await ProgressHelper.endDeployProgress(true);
    Logger.info(Messages.EndDeploy(PluginInfo.DisplayName));
    return ok(undefined);
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartGenerateArmTemplates(PluginInfo.DisplayName));

    const bicepTemplateDir = path.join(
      getTemplatesFolder(),
      FrontendPathInfo.BicepTemplateRelativeDir
    );

    const moduleFilePath = path.join(bicepTemplateDir, FrontendPathInfo.ModuleFileName);

    const inputParameterOrchestrationFilePath = path.join(
      bicepTemplateDir,
      Bicep.ParameterOrchestrationFileName
    );
    const moduleOrchestrationFilePath = path.join(
      bicepTemplateDir,
      Bicep.ModuleOrchestrationFileName
    );
    const outputOrchestrationFilePath = path.join(
      bicepTemplateDir,
      Bicep.OutputOrchestrationFileName
    );

    const result: ScaffoldArmTemplateResult = {
      Modules: {
        frontendHostingProvision: {
          Content: await fs.readFile(moduleFilePath, ConstantString.UTF8Encoding),
        },
      },
      Orchestration: {
        ParameterTemplate: {
          Content: await fs.readFile(
            inputParameterOrchestrationFilePath,
            ConstantString.UTF8Encoding
          ),
        },
        ModuleTemplate: {
          Content: await fs.readFile(moduleOrchestrationFilePath, ConstantString.UTF8Encoding),
          Outputs: {
            endpoint: FrontendOutputBicepSnippet.Endpoint,
            domain: FrontendOutputBicepSnippet.Domain,
          },
        },
        OutputTemplate: {
          Content: await fs.readFile(outputOrchestrationFilePath, ConstantString.UTF8Encoding),
        },
      },
    };

    return ok(result);
  }

  private async syncArmOutput(ctx: PluginContext) {
    const config = await FrontendConfig.fromPluginContext(ctx, true);
    config.storageResourceId = getArmOutput(ctx, ArmOutput.FrontendStorageResourceId) as string;
    config.endpoint = getArmOutput(ctx, ArmOutput.FrontendEndpoint) as string;
    config.domain = getArmOutput(ctx, ArmOutput.FrontendDomain) as string;
    config.syncToPluginContext(ctx);

    const client = new AzureStorageClient(config);
    await runWithErrorCatchAndThrow(
      new EnableStaticWebsiteError(),
      async () => await client.enableStaticWebsite()
    );
  }

  private async updateDotenv(ctx: PluginContext): Promise<void> {
    const envs: { [key: string]: string } = {};
    const addToEnvs = (key: string, value: string | undefined) => {
      if (value) {
        envs[key] = value;
      }
    };

    const solutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;

    if (solutionSettings?.azureResources?.includes(AzureResourceFunction.id)) {
      addToEnvs(EnvironmentVariables.FuncName, ctx.projectSettings?.defaultFunctionName);
      addToEnvs(
        EnvironmentVariables.FuncEndpoint,
        ctx.envInfo.profile
          .get(DependentPluginInfo.FunctionPluginName)
          ?.get(DependentPluginInfo.FunctionEndpoint) as string
      );
    }

    if (solutionSettings?.activeResourcePlugins?.includes(DependentPluginInfo.RuntimePluginName)) {
      addToEnvs(
        EnvironmentVariables.RuntimeEndpoint,
        ctx.envInfo.profile
          .get(DependentPluginInfo.RuntimePluginName)
          ?.get(DependentPluginInfo.RuntimeEndpoint) as string
      );
      addToEnvs(EnvironmentVariables.StartLoginPage, DependentPluginInfo.StartLoginPageURL);
    }

    if (solutionSettings?.activeResourcePlugins?.includes(DependentPluginInfo.AADPluginName)) {
      addToEnvs(
        EnvironmentVariables.ClientID,
        ctx.envInfo.profile
          .get(DependentPluginInfo.AADPluginName)
          ?.get(DependentPluginInfo.ClientID) as string
      );
    }

    const envFilePath = path.join(
      ctx.root,
      FrontendPathInfo.WorkingDir,
      FrontendPathInfo.TabEnvironmentFilePath
    );
    await EnvironmentUtils.writeEnvironments(envFilePath, envs);
  }

  public async executeUserTask(func: Func, ctx: PluginContext): Promise<TeamsFxResult> {
    if (func.method === "migrateV1Project") {
      Logger.info(Messages.StartMigrateV1Project(PluginInfo.DisplayName));
      const progressHandler = await ProgressHelper.startMigrateProgressHandler(ctx);
      await progressHandler?.next(MigrateSteps.Migrate);

      const sourceFolder = path.join(ctx.root, ArchiveFolderName);
      const distFolder = path.join(ctx.root, FrontendPathInfo.WorkingDir);
      const excludeFiles = [
        { fileName: ArchiveFolderName, recursive: false },
        { fileName: ArchiveLogFileName, recursive: false },
        { fileName: AppPackageFolderName, recursive: false },
        { fileName: FrontendPathInfo.NodePackageFolderName, recursive: true },
      ];

      await runWithErrorCatchAndThrow(new MigrateV1ProjectError(), async () => {
        await copyFiles(sourceFolder, distFolder, excludeFiles);
      });

      await ProgressHelper.endMigrateProgress(true);
      Logger.info(Messages.EndMigrateV1Project(PluginInfo.DisplayName));
      return ok(undefined);
    }
    throw new UserTaskNotImplementedError(func.method);
  }

  private async checkStorageAvailability(ctx: PluginContext) {
    const client = new AzureStorageClient(await FrontendConfig.fromPluginContext(ctx));
    await this.ensureResourceGroupExists(client);
    await this.ensureStorageExists(client);
    await this.ensureStorageAvailable(client);
  }

  private async ensureResourceGroupExists(client: AzureStorageClient) {
    const resourceGroupExists: boolean = await runWithErrorCatchAndThrow(
      new CheckResourceGroupError(),
      async () => await client.doesResourceGroupExists()
    );
    if (!resourceGroupExists) {
      throw new NoResourceGroupError();
    }
  }

  private async ensureStorageExists(client: AzureStorageClient) {
    const storageExists: boolean = await runWithErrorCatchAndThrow(
      new CheckStorageError(),
      async () => await client.doesStorageAccountExists()
    );
    if (!storageExists) {
      throw new NoStorageError();
    }
  }

  private async ensureStorageAvailable(client: AzureStorageClient) {
    const storageAvailable: boolean | undefined = await runWithErrorCatchAndThrow(
      new CheckStorageError(),
      async () => await client.isStorageStaticWebsiteEnabled()
    );
    if (!storageAvailable) {
      throw new StaticWebsiteDisabledError();
    }
  }
}
