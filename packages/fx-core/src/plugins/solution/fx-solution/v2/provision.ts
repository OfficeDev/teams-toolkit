import {
  Inputs,
  FxError,
  UserError,
  TokenProvider,
  returnSystemError,
  v2,
  v3,
  Result,
  Void,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import { getResourceGroupInPortal, getStrings } from "../../../../common/tools";
import { executeConcurrently } from "./executor";
import {
  combineRecords,
  ensurePermissionRequest,
  extractSolutionInputs,
  getAzureSolutionSettings,
  getSelectedPlugins,
  isAzureProject,
} from "./utils";
import {
  ARM_TEMPLATE_OUTPUT,
  GLOBAL_CONFIG,
  PluginNames,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
  SolutionSource,
} from "../constants";
import * as util from "util";
import _, { isUndefined } from "lodash";
import { PluginDisplayName } from "../../../../common/constants";
import { ProvisionContextAdapter } from "./adaptor";
import { deployArmTemplates } from "../arm";
import Container from "typedi";
import { ResourcePluginsV2 } from "../ResourcePluginContainer";
import { PermissionRequestFileProvider } from "../../../../core/permissionRequest";
import { Constants } from "../../../resource/appstudio/constants";
import { isPureExistingApp } from "../../../../core/utils";
import { BuiltInFeaturePluginNames } from "../v3/constants";
import { askForProvisionConsent, fillInAzureConfigs, getM365TenantId } from "../v3/provision";
import { resourceGroupHelper } from "../utils/ResourceGroupHelper";
import { solutionGlobalVars } from "../v3/solutionGlobalVars";

export async function provisionResource(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: v2.EnvInfoV2,
  tokenProvider: TokenProvider
): Promise<Result<Void, FxError>> {
  const azureSolutionSettings = getAzureSolutionSettings(ctx);

  // check projectPath
  if (inputs.projectPath === undefined) {
    return err(
      returnSystemError(
        new Error("projectPath is undefined"),
        SolutionSource,
        SolutionError.InternelError
      )
    );
  }
  const inputsNew: v2.InputsWithProjectPath = inputs as v2.InputsWithProjectPath;
  const projectPath: string = inputs.projectPath;

  // check M365 tenant
  if (!envInfo.state[BuiltInFeaturePluginNames.appStudio])
    envInfo.state[BuiltInFeaturePluginNames.appStudio] = {};
  const teamsAppResource = envInfo.state[BuiltInFeaturePluginNames.appStudio];
  if (!envInfo.state.solution) envInfo.state.solution = {};
  const solutionConfig = envInfo.state.solution;
  const tenantIdInConfig = teamsAppResource.tenantId;
  const tenantIdInTokenRes = await getM365TenantId(tokenProvider.appStudioToken);
  if (tenantIdInTokenRes.isErr()) {
    return err(tenantIdInTokenRes.error);
  }
  const tenantIdInToken = tenantIdInTokenRes.value;
  if (tenantIdInConfig && tenantIdInToken && tenantIdInToken !== tenantIdInConfig) {
    return err(
      new UserError(
        SolutionError.TeamsAppTenantIdNotRight,
        `The signed in M365 account does not match the M365 tenant in config file for '${envInfo.envName}' environment. Please sign out and sign in with the correct M365 account.`,
        "Solution"
      )
    );
  }
  if (!tenantIdInConfig) {
    teamsAppResource.tenantId = tenantIdInToken;
    solutionConfig.teamsAppTenantId = tenantIdInToken;
  }
  if (isAzureProject(azureSolutionSettings)) {
    if (ctx.permissionRequestProvider === undefined) {
      ctx.permissionRequestProvider = new PermissionRequestFileProvider(inputs.projectPath);
    }
    const result = await ensurePermissionRequest(
      azureSolutionSettings!,
      ctx.permissionRequestProvider
    );
    if (result.isErr()) {
      return err(result.error);
    }

    // ask common question and fill in solution config
    const solutionConfigRes = await fillInAzureConfigs(
      ctx,
      inputsNew,
      envInfo as v3.EnvInfoV3,
      tokenProvider
    );
    if (solutionConfigRes.isErr()) {
      return err(solutionConfigRes.error);
    }

    // ask for provision consent
    const consentResult = await askForProvisionConsent(
      ctx,
      tokenProvider.azureAccountProvider,
      envInfo as v3.EnvInfoV3
    );
    if (consentResult.isErr()) {
      return err(consentResult.error);
    }

    // create resource group if needed
    if (solutionConfig.needCreateResourceGroup) {
      const createRgRes = await resourceGroupHelper.createNewResourceGroup(
        solutionConfig.resourceGroupName,
        tokenProvider.azureAccountProvider,
        solutionConfig.subscriptionId,
        solutionConfig.location
      );
      if (createRgRes.isErr()) {
        return err(createRgRes.error);
      }
    }
  }

  const pureExistingApp = isPureExistingApp(ctx.projectSetting);

  envInfo.state[GLOBAL_CONFIG][SOLUTION_PROVISION_SUCCEEDED] = false;
  const solutionInputs = extractSolutionInputs(envInfo.state[GLOBAL_CONFIG]);
  // for minimized teamsfx project, there is only one plugin (app studio)
  const plugins = pureExistingApp
    ? [Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin)]
    : getSelectedPlugins(ctx.projectSetting);
  const provisionThunks = plugins
    .filter((plugin) => !isUndefined(plugin.provisionResource))
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "provisionResource",
        thunk: () => {
          if (!envInfo.state[plugin.name]) {
            envInfo.state[plugin.name] = {};
          }
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return plugin.provisionResource!(
            ctx,
            { ...inputs, ...solutionInputs, projectPath: projectPath },
            envInfo,
            tokenProvider
          );
        },
      };
    });
  // call provisionResources
  ctx.logProvider?.info(
    util.format(getStrings().solution.ProvisionStartNotice, PluginDisplayName.Solution)
  );
  const provisionResult = await executeConcurrently(provisionThunks, ctx.logProvider);
  if (provisionResult.kind === "failure" || provisionResult.kind === "partialSuccess") {
    return err(provisionResult.error);
  }

  ctx.logProvider?.info(
    util.format(getStrings().solution.ProvisionFinishNotice, PluginDisplayName.Solution)
  );

  const teamsAppId = envInfo.state[PluginNames.APPST][Constants.TEAMS_APP_ID] as string;
  solutionGlobalVars.TeamsAppId = teamsAppId;
  solutionInputs.remoteTeamsAppId = teamsAppId;

  // call deployArmTemplates
  if (isAzureProject(azureSolutionSettings) && !inputs.isForUT) {
    const contextAdaptor = new ProvisionContextAdapter([ctx, inputs, envInfo, tokenProvider]);
    const armDeploymentResult = await deployArmTemplates(contextAdaptor);
    if (armDeploymentResult.isErr()) {
      return err(armDeploymentResult.error);
    }
    // contextAdaptor deep-copies original JSON into a map. We need to convert it back.
    const update = contextAdaptor.getEnvStateJson();
    _.assign(envInfo.state, update);
  }

  // there is no aad for minimized teamsfx project
  if (!pureExistingApp) {
    // call aad.setApplicationInContext
    const aadPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AadPlugin);
    if (plugins.some((plugin) => plugin.name === aadPlugin.name) && aadPlugin.executeUserTask) {
      const result = await aadPlugin.executeUserTask(
        ctx,
        inputs,
        {
          namespace: `${PluginNames.SOLUTION}/${PluginNames.AAD}`,
          method: "setApplicationInContext",
          params: { isLocal: false },
        },
        {},
        envInfo,
        tokenProvider
      );
      if (result.isErr()) {
        return err(result.error);
      }
    }
  }

  const configureResourceThunks = plugins
    .filter((plugin) => !isUndefined(plugin.configureResource))
    .map((plugin) => {
      if (!envInfo.state[plugin.name]) {
        envInfo.state[plugin.name] = {};
      }
      return {
        pluginName: `${plugin.name}`,
        taskName: "configureResource",
        thunk: () =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          plugin.configureResource!(
            ctx,
            { ...inputs, ...solutionInputs, projectPath: projectPath },
            envInfo,
            tokenProvider
          ),
      };
    });
  //call configResource
  const configureResourceResult = await executeConcurrently(
    configureResourceThunks,
    ctx.logProvider
  );
  ctx.logProvider?.info(
    util.format(getStrings().solution.ConfigurationFinishNotice, PluginDisplayName.Solution)
  );
  if (
    configureResourceResult.kind === "failure" ||
    configureResourceResult.kind === "partialSuccess"
  ) {
    const msg = util.format(getStrings().solution.ProvisionFailNotice, ctx.projectSetting.appName);
    ctx.logProvider.error(msg);
    solutionInputs[SOLUTION_PROVISION_SUCCEEDED] = false;
    return err(configureResourceResult.error);
  } else {
    if (envInfo.state[GLOBAL_CONFIG] && envInfo.state[GLOBAL_CONFIG][ARM_TEMPLATE_OUTPUT]) {
      delete envInfo.state[GLOBAL_CONFIG][ARM_TEMPLATE_OUTPUT];
    }

    if (!pureExistingApp) {
      const url = getResourceGroupInPortal(
        solutionInputs.subscriptionId,
        solutionInputs.tenantId,
        solutionInputs.resourceGroupName
      );
      const msg = util.format(
        `Success: ${getStrings().solution.ProvisionSuccessNotice}`,
        ctx.projectSetting.appName
      );
      ctx.logProvider?.info(msg);
      if (url) {
        const title = "View Provisioned Resources";
        ctx.userInteraction.showMessage("info", msg, false, title).then((result) => {
          const userSelected = result.isOk() ? result.value : undefined;
          if (userSelected === title) {
            ctx.userInteraction.openUrl(url);
          }
        });
      } else {
        ctx.userInteraction.showMessage("info", msg, false);
      }
    }
    envInfo.state[GLOBAL_CONFIG][SOLUTION_PROVISION_SUCCEEDED] = true;
    return ok(Void);
  }
}
