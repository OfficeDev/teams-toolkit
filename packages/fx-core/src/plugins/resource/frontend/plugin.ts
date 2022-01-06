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
  AzureErrorCode,
  AzureInfo,
  DependentPluginInfo,
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
  PostProvisionSteps,
  PreDeploySteps,
  ProgressHelper,
  ProvisionSteps,
  ScaffoldSteps,
} from "./utils/progress-helper";
import { TemplateInfo } from "./resources/templateInfo";
import { AzureClientFactory, AzureLib } from "./utils/azure-client";
import { getTemplatesFolder } from "../../../folder";
import { ArmTemplateResult } from "../../../common/armInterface";
import { Bicep } from "../../../common/constants";
import { copyFiles, isArmSupportEnabled } from "../../../common";
import { AzureResourceFunction } from "../../solution/fx-solution/question";
import { envFilePath, EnvKeys, loadEnvFile, saveEnvFile } from "./env";
import { getActivatedV2ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../solution/fx-solution/v2/adaptor";
import { generateBicepFromFile, IsSimpleAuthEnabled } from "../../../common/tools";
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
      Logger.info(Messages.StartPostProvision(PluginInfo.DisplayName));
      const progressHandler = await ProgressHelper.startPostProvisionProgressHandler(ctx);
      await progressHandler?.next(PostProvisionSteps.EnableStaticWebsite);

      const client = new AzureStorageClient(await FrontendConfig.fromPluginContext(ctx));
      await runWithErrorCatchAndThrow(
        new EnableStaticWebsiteError(),
        async () => await client.enableStaticWebsite()
      );

      await ProgressHelper.endPostProvisionProgress(true);
      Logger.info(Messages.EndPostProvision(PluginInfo.DisplayName));
    }

    await this.updateDotEnv(ctx);

    return ok(undefined);
  }

  public async preDeploy(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartPreDeploy(PluginInfo.DisplayName));
    const progressHandler = await ProgressHelper.createPreDeployProgressHandler(ctx);

    await this.updateDotEnv(ctx);

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
    const envName = ctx.envInfo.envName;

    const envs = await loadEnvFile(envFilePath(envName, componentPath));

    await FrontendDeployment.doFrontendBuild(componentPath, envs, envName);
    await FrontendDeployment.doFrontendDeployment(client, componentPath, envName);

    await ProgressHelper.endDeployProgress(true);
    Logger.info(Messages.EndDeploy(PluginInfo.DisplayName));
    return ok(undefined);
  }

  public async updateArmTemplates(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartUpdateArmTemplates(PluginInfo.DisplayName));

    const result: ArmTemplateResult = {
      Reference: {
        endpoint: FrontendOutputBicepSnippet.Endpoint,
        domain: FrontendOutputBicepSnippet.Domain,
      },
    };

    return ok(result);
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartGenerateArmTemplates(PluginInfo.DisplayName));
    const azureSolutionSettings = ctx.projectSettings!.solutionSettings as AzureSolutionSettings;
    const plugins = getActivatedV2ResourcePlugins(azureSolutionSettings).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const bicepTemplateDir = path.join(
      getTemplatesFolder(),
      FrontendPathInfo.BicepTemplateRelativeDir
    );

    const provisionFilePath = path.join(bicepTemplateDir, Bicep.ProvisionFileName);
    const moduleProvisionFilePath = path.join(
      bicepTemplateDir,
      FrontendPathInfo.ModuleProvisionFileName
    );
    const provisionOrchestration = await generateBicepFromFile(provisionFilePath, pluginCtx);
    const provisionModules = await generateBicepFromFile(moduleProvisionFilePath, pluginCtx);

    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { frontendHosting: provisionModules },
      },
      Reference: {
        endpoint: FrontendOutputBicepSnippet.Endpoint,
        domain: FrontendOutputBicepSnippet.Domain,
      },
    };

    return ok(result);
  }

  private collectEnvs(ctx: PluginContext): { [key: string]: string } {
    const envs: { [key: string]: string } = {};
    const addToEnvs = (key: string, value: string | undefined) => {
      // Check for both null and undefined, add to envs when value is "", 0 or false.
      if (value != null) {
        envs[key] = value;
      }
    };

    const solutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;

    if (solutionSettings?.azureResources?.includes(AzureResourceFunction.id)) {
      addToEnvs(EnvKeys.FuncName, ctx.projectSettings?.defaultFunctionName);
      addToEnvs(
        EnvKeys.FuncEndpoint,
        ctx.envInfo.state
          .get(DependentPluginInfo.FunctionPluginName)
          ?.get(DependentPluginInfo.FunctionEndpoint) as string
      );
    }

    if (IsSimpleAuthEnabled(ctx.projectSettings)) {
      addToEnvs(
        EnvKeys.RuntimeEndpoint,
        ctx.envInfo.state
          .get(DependentPluginInfo.RuntimePluginName)
          ?.get(DependentPluginInfo.RuntimeEndpoint) as string
      );
      addToEnvs(EnvKeys.StartLoginPage, DependentPluginInfo.StartLoginPageURL);
    }

    if (solutionSettings?.activeResourcePlugins?.includes(DependentPluginInfo.AADPluginName)) {
      addToEnvs(
        EnvKeys.ClientID,
        ctx.envInfo.state
          .get(DependentPluginInfo.AADPluginName)
          ?.get(DependentPluginInfo.ClientID) as string
      );
    }
    return envs;
  }

  private async updateDotEnv(ctx: PluginContext): Promise<void> {
    const envs = this.collectEnvs(ctx);
    await saveEnvFile(
      envFilePath(ctx.envInfo.envName, path.join(ctx.root, FrontendPathInfo.WorkingDir)),
      {
        teamsfxRemoteEnvs: envs,
        customizedRemoteEnvs: {},
      }
    );
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
