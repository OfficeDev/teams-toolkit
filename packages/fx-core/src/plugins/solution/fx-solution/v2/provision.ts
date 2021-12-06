import {
  v2,
  Inputs,
  FxError,
  Result,
  ok,
  err,
  returnUserError,
  TokenProvider,
  Void,
  SolutionContext,
  returnSystemError,
} from "@microsoft/teamsfx-api";
import {
  getResourceGroupInPortal,
  getStrings,
  isArmSupportEnabled,
  isMultiEnvEnabled,
} from "../../../../common/tools";
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
  SUBSCRIPTION_ID,
  SUBSCRIPTION_NAME,
  SolutionSource,
  RESOURCE_GROUP_NAME,
} from "../constants";
import * as util from "util";
import _, { isUndefined } from "lodash";
import { PluginDisplayName } from "../../../../common/constants";
import { ProvisionContextAdapter } from "./adaptor";
import { fillInCommonQuestions } from "../commonQuestions";
import { deployArmTemplates } from "../arm";
import Container from "typedi";
import { ResourcePluginsV2 } from "../ResourcePluginContainer";
import { EnvInfoV2 } from "@microsoft/teamsfx-api/build/v2";
import { PermissionRequestFileProvider } from "../../../../core/permissionRequest";
import { isV2, isVsCallingCli } from "../../../../core";
import { Constants } from "../../../resource/appstudio/constants";
import { assignJsonInc } from "../../../resource/utils4v2";

export async function provisionResource(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
  tokenProvider: TokenProvider
): Promise<v2.FxResult<v2.SolutionProvisionOutput, FxError>> {
  if (inputs.projectPath === undefined) {
    return new v2.FxFailure(
      returnSystemError(
        new Error("projectPath is undefined"),
        SolutionSource,
        SolutionError.InternelError
      )
    );
  }
  const projectPath: string = inputs.projectPath;

  const azureSolutionSettings = getAzureSolutionSettings(ctx);
  // Just to trigger M365 login before the concurrent execution of provision.
  // Because concurrent exectution of provision may getAccessToken() concurrently, which
  // causes 2 M365 logins before the token caching in common lib takes effect.
  await tokenProvider.appStudioToken.getAccessToken();

  if (isAzureProject(azureSolutionSettings)) {
    if (ctx.permissionRequestProvider === undefined) {
      ctx.permissionRequestProvider = new PermissionRequestFileProvider(inputs.projectPath);
    }
    const result = await ensurePermissionRequest(
      azureSolutionSettings,
      ctx.permissionRequestProvider
    );
    if (result.isErr()) {
      return new v2.FxFailure(result.error);
    }
  }

  const newEnvInfo: EnvInfoV2 = _.cloneDeep(envInfo);
  if (!newEnvInfo.state[GLOBAL_CONFIG]) {
    newEnvInfo.state[GLOBAL_CONFIG] = { output: {}, secrets: {} };
  }
  if (isAzureProject(azureSolutionSettings)) {
    const appName = ctx.projectSetting.appName;
    const contextAdaptor = new ProvisionContextAdapter([ctx, inputs, newEnvInfo, tokenProvider]);
    const res = await fillInCommonQuestions(
      contextAdaptor,
      appName,
      contextAdaptor.envInfo.state,
      tokenProvider.azureAccountProvider,
      await tokenProvider.appStudioToken.getJsonObject()
    );
    if (res.isErr()) {
      return new v2.FxFailure(res.error);
    }
    // contextAdaptor deep-copies original JSON into a map. We need to convert it back.
    newEnvInfo.state = contextAdaptor.getEnvStateJson();
    const consentResult = await askForProvisionConsent(contextAdaptor);
    if (consentResult.isErr()) {
      return new v2.FxFailure(consentResult.error);
    }
  }

  const solutionInputs = extractSolutionInputs(newEnvInfo.state[GLOBAL_CONFIG]["output"]);

  const plugins = getSelectedPlugins(azureSolutionSettings);
  const provisionThunks = plugins
    .filter((plugin) => !isUndefined(plugin.provisionResource))
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "provisionResource",
        thunk: () => {
          if (!newEnvInfo.state[plugin.name]) {
            newEnvInfo.state[plugin.name] = {};
          }
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return plugin.provisionResource!(
            ctx,
            { ...inputs, ...solutionInputs, projectPath: projectPath },
            { ...newEnvInfo, state: newEnvInfo.state },
            tokenProvider
          );
        },
      };
    });

  ctx.logProvider?.info(
    util.format(getStrings().solution.ProvisionStartNotice, PluginDisplayName.Solution)
  );
  const provisionResult = await executeConcurrently(provisionThunks, ctx.logProvider);
  if (provisionResult.kind === "failure") {
    return provisionResult;
  } else if (provisionResult.kind === "partialSuccess") {
    return new v2.FxPartialSuccess(
      { ...newEnvInfo.state, ...combineRecords(provisionResult.output) },
      provisionResult.error
    );
  } else {
    newEnvInfo.state = { ...newEnvInfo.state, ...combineRecords(provisionResult.output) };
  }

  ctx.logProvider?.info(
    util.format(getStrings().solution.ProvisionFinishNotice, PluginDisplayName.Solution)
  );

  if (isArmSupportEnabled() && isAzureProject(azureSolutionSettings)) {
    const contextAdaptor = new ProvisionContextAdapter([ctx, inputs, newEnvInfo, tokenProvider]);
    const armDeploymentResult = await deployArmTemplates(contextAdaptor);
    if (armDeploymentResult.isErr()) {
      return new v2.FxPartialSuccess(
        combineRecords(provisionResult.output),
        armDeploymentResult.error
      );
    }
    // contextAdaptor deep-copies original JSON into a map. We need to convert it back.
    newEnvInfo.state = contextAdaptor.getEnvStateJson();
  }

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
      newEnvInfo,
      tokenProvider
    );
    if (result.isErr()) {
      return new v2.FxPartialSuccess(combineRecords(provisionResult.output), result.error);
    }
  }

  if (isV2() && !isAzureProject(azureSolutionSettings)) {
    solutionInputs.remoteTeamsAppId =
      newEnvInfo.state[PluginNames.APPST]["output"][Constants.TEAMS_APP_ID];
  }
  const configureResourceThunks = plugins
    .filter((plugin) => !isUndefined(plugin.configureResource))
    .map((plugin) => {
      if (!newEnvInfo.state[plugin.name]) {
        newEnvInfo.state[plugin.name] = {};
      }

      return {
        pluginName: `${plugin.name}`,
        taskName: "configureLocalResource",
        thunk: () =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          plugin.configureResource!(
            ctx,
            { ...inputs, ...solutionInputs, projectPath: projectPath },
            { ...newEnvInfo, state: newEnvInfo.state },
            tokenProvider
          ),
      };
    });

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

    if (configureResourceResult.kind === "failure") {
      return configureResourceResult;
    } else {
      const output = configureResourceResult.output;
      output.push({ name: GLOBAL_CONFIG, result: { output: solutionInputs, secrets: {} } });
      return new v2.FxPartialSuccess(combineRecords(output), configureResourceResult.error);
    }
  } else {
    if (newEnvInfo.state[GLOBAL_CONFIG] && newEnvInfo.state[GLOBAL_CONFIG][ARM_TEMPLATE_OUTPUT]) {
      delete newEnvInfo.state[GLOBAL_CONFIG][ARM_TEMPLATE_OUTPUT];
    }

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

    solutionInputs[SOLUTION_PROVISION_SUCCEEDED] = true;
    const configOutput = configureResourceResult.output;
    configOutput.push({ name: GLOBAL_CONFIG, result: { output: solutionInputs, secrets: {} } });
    const res1 = combineRecords(provisionResult.output);
    const res2 = combineRecords(configOutput);
    for (const key of Object.keys(res2)) {
      if (!newEnvInfo.state[key]) {
        newEnvInfo.state[key].output = res2[key].output;
      } else {
        const newOutput = assignJsonInc(newEnvInfo.state[key].output, res2[key].output);
        if (newOutput) newEnvInfo.state[key].output = newOutput;
      }
    }
    for (const key of Object.keys(newEnvInfo.state)) {
      if (!res1[key]) res1[key] = { output: {}, secrets: {} };
      res1[key].output = newEnvInfo.state[key].output;
    }
    return new v2.FxSuccess(res1);
  }
}

export async function askForProvisionConsent(ctx: SolutionContext): Promise<Result<Void, FxError>> {
  if (isVsCallingCli()) {
    // Skip asking users for input on VS calling CLI to simplify user interaction.
    return ok(Void);
  }

  const azureToken = await ctx.azureAccountProvider?.getAccountCredentialAsync();

  // Only Azure project requires this confirm dialog
  const username = (azureToken as any).username ? (azureToken as any).username : "";
  const subscriptionId = ctx.envInfo.state.get(GLOBAL_CONFIG)?.get(SUBSCRIPTION_ID) as string;
  const subscriptionName = ctx.envInfo.state.get(GLOBAL_CONFIG)?.get(SUBSCRIPTION_NAME) as string;

  const msg = util.format(
    getStrings().solution.ProvisionConfirmNotice,
    username,
    subscriptionName ? subscriptionName : subscriptionId
  );
  let confirmRes = undefined;
  if (isMultiEnvEnabled()) {
    const msgNew = util.format(
      getStrings().solution.ProvisionConfirmEnvNotice,
      ctx.envInfo.envName,
      username,
      subscriptionName ? subscriptionName : subscriptionId
    );
    confirmRes = await ctx.ui?.showMessage("warn", msgNew, true, "Provision");
  } else {
    confirmRes = await ctx.ui?.showMessage("warn", msg, true, "Provision", "Pricing calculator");
  }
  const confirm = confirmRes?.isOk() ? confirmRes.value : undefined;

  if (confirm !== "Provision") {
    if (confirm === "Pricing calculator") {
      ctx.ui?.openUrl("https://azure.microsoft.com/en-us/pricing/calculator/");
    }

    return err(
      returnUserError(
        new Error(getStrings().solution.CancelProvision),
        SolutionSource,
        getStrings().solution.CancelProvision
      )
    );
  }
  return ok(Void);
}
