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
import { TeamsFxSolutionSettings } from "../../../../../../api/build/v3";
import { BuiltInResourcePluginNames } from "../../../solution/fx-solution/v3/constants";
import { TeamsFxAzureSolution } from "../../../solution/fx-solution/v3/solution";
import { Messages } from "../resources/messages";
import * as path from "path";
import { getTemplatesFolder } from "../../../../folder";
import { FrontendOutputBicepSnippet, FrontendPathInfo, FrontendPluginInfo } from "../constants";
import { Bicep } from "../../../../common/constants";
import {
  generateBicepFromFile,
  getResourceGroupNameFromResourceId,
  getStorageAccountNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../../common/tools";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { PostProvisionSteps } from "../utils/progress-helper";
import { AzureStorageClient } from "../clients";
import { FrontendConfig } from "../configs";
import {
  EnableStaticWebsiteError,
  runWithErrorCatchAndThrow,
  UnauthenticatedError,
} from "../resources/errors";
import { AzureStorageState } from "@azure/arm-appservice/esm/models";
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
    const credentials = await tokenProvider.azureAccountProvider.getAccountCredentialAsync();
    if (!credentials) {
      return err(
        new UserError(
          "UnauthenticatedError",
          "Failed to get user login information.",
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

    const client = new AzureStorageClient(frontendConfig);
    await runWithErrorCatchAndThrow(
      new EnableStaticWebsiteError(),
      async () => await client.enableStaticWebsite()
    );

    await progress.end(true);
    ctx.logProvider.info(Messages.EndPostProvision(this.name));

    // await this.updateDotEnv(ctx);//TODO

    return ok(Void);
  }

  async deploy(
    ctx: v2.Context,
    inputs: v3.PluginDeployInputs,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider.info(`fx-resource-azure-storage deploy success!`);
    return ok(Void);
  }
}
