// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  err,
  FxError,
  Inputs,
  ok,
  OptionItem,
  QTreeNode,
  Result,
  TokenProvider,
  UserError,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { cloneDeep } from "lodash";
import { Container, Service } from "typedi";
import {
  AADApp,
  AzureFunction,
  SimpleAuth,
  TeamsFxAzureEnvInfo,
  TeamsFxSolutionSettings,
} from "../../../../../../api/build/v3";
import { BuiltInResourcePluginNames } from "../../../solution/fx-solution/v3/constants";
import { TeamsFxAzureSolution } from "../../../solution/fx-solution/v3/solution";
import { Messages } from "../resources/messages";
import * as path from "path";
import { getTemplatesFolder } from "../../../../folder";
import {
  DependentPluginInfo,
  FrontendOutputBicepSnippet,
  FrontendPathInfo,
  FrontendPluginInfo,
} from "../constants";
import { Bicep } from "../../../../common/constants";
import {
  generateBicepFromFile,
  getResourceGroupNameFromResourceId,
  getStorageAccountNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../../common/tools";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { DeploySteps, PostProvisionSteps } from "../utils/progress-helper";
import { AzureStorageClient } from "../clients";
import { FrontendConfig } from "../configs";
import {
  EnableStaticWebsiteError,
  runWithErrorCatchAndThrow,
  tips,
  UnauthenticatedError,
} from "../resources/errors";
import { AzureStorageState } from "@azure/arm-appservice/esm/models";
import { envFilePath, EnvKeys, loadEnvFile, saveEnvFile } from "../env";
import { AzureResourceFunction } from "../../../solution/fx-solution/question";
import { FrontendDeployment } from "../ops/deploy";
@Service(BuiltInResourcePluginNames.storage)
export class AzureStoragePlugin implements v3.ResourcePlugin {
  resourceType = "Azure Storage";
  description = "Azure Storage";
  name = BuiltInResourcePluginNames.storage;
  async generateResourceTemplate(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    ctx.logProvider.info(Messages.StartGenerateArmTemplates(this.name));
    const solutionSettings = ctx.projectSetting.solutionSettings as TeamsFxSolutionSettings;
    const pluginCtx = { plugins: solutionSettings.activeResourcePlugins };
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
    return ok({ kind: "bicep", template: result });
  }

  public async updateResourceTemplate(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    ctx.logProvider.info(Messages.StartUpdateArmTemplates(this.name));
    const result: ArmTemplateResult = {
      Reference: {
        endpoint: FrontendOutputBicepSnippet.Endpoint,
        domain: FrontendOutputBicepSnippet.Domain,
      },
    };
    return ok({ kind: "bicep", template: result });
  }

  private async buildFrontendConfig(
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<FrontendConfig, FxError>> {
    const credentials = await tokenProvider.getAccountCredentialAsync();
    if (!credentials) {
      return err(
        new UserError(
          "UnauthenticatedError",
          `Failed to get user login information. Suggestions: ${tips.doLogin}`,
          FrontendPluginInfo.ShortName
        )
      );
    }
    const envInfoV3 = envInfo as v3.TeamsFxAzureEnvInfo;
    const storage = envInfoV3.state[this.name];
    const frontendConfig = new FrontendConfig(
      getSubscriptionIdFromResourceId(storage.storageResourceId),
      getResourceGroupNameFromResourceId(storage.storageResourceId),
      envInfoV3.state.solution.location,
      getStorageAccountNameFromResourceId(storage.storageResourceId),
      credentials
    );
    return ok(frontendConfig);
  }
  async configureResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider.info(Messages.StartPostProvision(this.name));
    const progress = ctx.userInteraction.createProgressBar(
      Messages.PostProvisionProgressTitle,
      Object.entries(PostProvisionSteps).length
    );
    await progress.start(Messages.ProgressStart);
    await progress.next(PostProvisionSteps.EnableStaticWebsite);
    const frontendConfigRes = await this.buildFrontendConfig(
      envInfo,
      tokenProvider.azureAccountProvider
    );
    if (frontendConfigRes.isErr()) {
      return err(frontendConfigRes.error);
    }
    const client = new AzureStorageClient(frontendConfigRes.value);
    try {
      await client.enableStaticWebsite();
    } catch (e) {
      return err(
        new UserError(
          "EnableStaticWebsiteError",
          `Failed to enable static website feature for Azure Storage Account. Suggestions: ${[
            tips.checkSystemTime,
            tips.checkStoragePermissions,
          ].join(" ")}`,
          FrontendPluginInfo.ShortName,
          undefined,
          FrontendPluginInfo.HelpLink
        )
      );
    }
    await progress.end(true);
    await this.updateDotEnv(ctx, inputs, envInfo);
    ctx.logProvider.info(Messages.EndPostProvision(this.name));
    return ok(Void);
  }

  async deploy(
    ctx: v2.Context,
    inputs: v3.PluginDeployInputs,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider.info(Messages.StartDeploy(this.name));
    const progress = ctx.userInteraction.createProgressBar(
      Messages.DeployProgressTitle,
      Object.entries(DeploySteps).length
    );
    await progress.start(Messages.ProgressStart);
    const frontendConfigRes = await this.buildFrontendConfig(envInfo, tokenProvider);
    if (frontendConfigRes.isErr()) {
      return err(frontendConfigRes.error);
    }
    const client = new AzureStorageClient(frontendConfigRes.value);

    //TODO deploy according to build type
    const componentPath: string = inputs.dir
      ? inputs.dir
      : path.join(inputs.projectPath, FrontendPathInfo.WorkingDir);
    const envName = envInfo.envName;

    const envs = await loadEnvFile(envFilePath(envName, componentPath));

    await FrontendDeployment.doFrontendBuild(componentPath, envs, envName);
    await FrontendDeployment.doFrontendDeployment(client, componentPath, envName);

    await progress.end(true);
    ctx.logProvider.info(Messages.EndDeploy(this.name));
    return ok(Void);
  }

  private async updateDotEnv(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>
  ): Promise<Result<Void, FxError>> {
    const envs = this.collectEnvs(ctx, inputs, envInfo);
    await saveEnvFile(
      envFilePath(envInfo.envName, path.join(inputs.projectPath, FrontendPathInfo.WorkingDir)),
      {
        teamsfxRemoteEnvs: envs,
        customizedRemoteEnvs: {},
      }
    );
    return ok(Void);
  }
  private collectEnvs(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>
  ): { [key: string]: string } {
    const envs: { [key: string]: string } = {};
    const addToEnvs = (key: string, value: string | undefined) => {
      // Check for both null and undefined, add to envs when value is "", 0 or false.
      if (value != null) {
        envs[key] = value;
      }
    };

    const solutionSettings = ctx.projectSetting.solutionSettings as TeamsFxSolutionSettings;
    if (solutionSettings.activeResourcePlugins.includes(BuiltInResourcePluginNames.function)) {
      const functionState = envInfo.state[BuiltInResourcePluginNames.function] as AzureFunction;
      addToEnvs(EnvKeys.FuncName, ctx.projectSetting.defaultFunctionName);
      addToEnvs(EnvKeys.FuncEndpoint, functionState.functionEndpoint);
    }

    if (solutionSettings.activeResourcePlugins.includes(BuiltInResourcePluginNames.simpleAuth)) {
      const simpleAuthState = envInfo.state[BuiltInResourcePluginNames.simpleAuth] as SimpleAuth;
      addToEnvs(EnvKeys.RuntimeEndpoint, simpleAuthState.endpoint);
      addToEnvs(EnvKeys.StartLoginPage, DependentPluginInfo.StartLoginPageURL);
    }

    if (solutionSettings.activeResourcePlugins.includes(BuiltInResourcePluginNames.aad)) {
      const aadState = envInfo.state[BuiltInResourcePluginNames.aad] as AADApp;
      addToEnvs(EnvKeys.ClientID, aadState.clientId);
    }
    return envs;
  }
}
