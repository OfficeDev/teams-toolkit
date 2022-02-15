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
  EnableStaticWebsiteError,
  NoResourceGroupError,
  NoStorageError,
  StaticWebsiteDisabledError,
  runWithErrorCatchAndThrow,
  CheckStorageError,
  CheckResourceGroupError,
  UserTaskNotImplementedError,
  MigrateV1ProjectError,
} from "./resources/errors";
import {
  Constants,
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
import { ProgressHelper } from "./utils/progress-helper";
import {
  DeployProgress,
  MigrateProgress,
  PostProvisionProgress,
  PreDeployProgress,
  ScaffoldProgress,
} from "./resources/steps";
import { TemplateInfo } from "./resources/templateInfo";
import { getTemplatesFolder } from "../../../folder";
import { ArmTemplateResult } from "../../../common/armInterface";
import { Bicep } from "../../../common/constants";
import { copyFiles } from "../../../common";
import { AzureResourceFunction } from "../../solution/fx-solution/question";
import { envFilePath, EnvKeys, loadEnvFile, saveEnvFile } from "./env";
import { getActivatedV2ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../solution/fx-solution/v2/adaptor";
import { generateBicepFromFile, IsSimpleAuthEnabled } from "../../../common/tools";
import { LocalSettingsFrontendKeys } from "../../../common/localSettingsConstants";
import { PluginImpl } from "./interface";

export class FrontendPluginImpl implements PluginImpl {
  public async scaffold(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartScaffold(PluginInfo.DisplayName));
    const progressHandler = await ProgressHelper.startProgress(ctx, ScaffoldProgress);
    await progressHandler?.next(ScaffoldProgress.steps.Scaffold);

    const templateInfo = new TemplateInfo(ctx);

    await Scaffold.scaffoldFromZipPackage(
      path.join(ctx.root, FrontendPathInfo.WorkingDir),
      templateInfo
    );

    await ProgressHelper.endProgress(true);
    Logger.info(Messages.EndScaffold(PluginInfo.DisplayName));
    return ok(undefined);
  }

  public async postProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartPostProvision(PluginInfo.DisplayName));
    const progressHandler = await ProgressHelper.startProgress(ctx, PostProvisionProgress);
    await progressHandler?.next(PostProvisionProgress.steps.EnableStaticWebsite);

    const client = new AzureStorageClient(await FrontendConfig.fromPluginContext(ctx));
    await runWithErrorCatchAndThrow(
      new EnableStaticWebsiteError(),
      async () => await client.enableStaticWebsite()
    );

    await ProgressHelper.endProgress(true);
    Logger.info(Messages.EndPostProvision(PluginInfo.DisplayName));

    await this.updateDotEnv(ctx);

    return ok(undefined);
  }

  public async preDeploy(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartPreDeploy(PluginInfo.DisplayName));
    const progressHandler = await ProgressHelper.startProgress(ctx, PreDeployProgress);

    await this.updateDotEnv(ctx);

    await progressHandler?.next(PreDeployProgress.steps.CheckStorage);
    await this.checkStorageAvailability(ctx);

    await ProgressHelper.endProgress(true);
    Logger.info(Messages.EndPreDeploy(PluginInfo.DisplayName));
    return ok(undefined);
  }

  public async deploy(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartDeploy(PluginInfo.DisplayName));
    await ProgressHelper.startProgress(ctx, DeployProgress);

    const config = await FrontendConfig.fromPluginContext(ctx);
    const client = new AzureStorageClient(config);

    const componentPath: string = path.join(ctx.root, FrontendPathInfo.WorkingDir);
    const envName = ctx.envInfo.envName;

    const envs = await loadEnvFile(envFilePath(envName, componentPath));

    await FrontendDeployment.doFrontendBuild(componentPath, envs, envName);
    await FrontendDeployment.doFrontendDeployment(client, componentPath, envName);

    await ProgressHelper.endProgress(true);
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
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
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

  public async localDebug(ctx: PluginContext): Promise<TeamsFxResult> {
    ctx.localSettings?.frontend?.set(
      LocalSettingsFrontendKeys.TabIndexPath,
      Constants.FrontendIndexPath
    );
    return ok(undefined);
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
    }

    if (solutionSettings?.activeResourcePlugins?.includes(DependentPluginInfo.AADPluginName)) {
      addToEnvs(
        EnvKeys.ClientID,
        ctx.envInfo.state
          .get(DependentPluginInfo.AADPluginName)
          ?.get(DependentPluginInfo.ClientID) as string
      );
      addToEnvs(EnvKeys.StartLoginPage, DependentPluginInfo.StartLoginPageURL);
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
      const progressHandler = await ProgressHelper.startProgress(ctx, MigrateProgress);
      await progressHandler?.next(MigrateProgress.steps.Migrate);

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

      await ProgressHelper.endProgress(true);
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
