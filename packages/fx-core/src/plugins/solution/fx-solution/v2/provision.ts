import {
  v2,
  Inputs,
  FxError,
  Result,
  ok,
  err,
  returnUserError,
  AzureAccountProvider,
  TokenProvider,
  Json,
  EnvInfo,
  ConfigMap,
  UserInteraction,
  ProjectSettings,
  Void,
  SolutionContext,
} from "@microsoft/teamsfx-api";
import { getStrings, isMultiEnvEnabled } from "../../../../common/tools";
import { executeConcurrently, NamedThunk } from "./executor";
import {
  blockV1Project,
  combineRecords,
  ensurePermissionRequest,
  extractSolutionInputs,
  getAzureSolutionSettings,
  getSelectedPlugins,
  isAzureProject,
} from "./utils";
import {
  GLOBAL_CONFIG,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
  SUBSCRIPTION_ID,
  SUBSCRIPTION_NAME,
} from "../constants";
import * as util from "util";
import { AzureSolutionQuestionNames } from "../question";
import { isUndefined } from "lodash";
import { PluginDisplayName } from "../../../../common/constants";
import { PermissionRequestFileProvider } from "../../../../core/permissionRequest";
import { ProvisionContextAdapter } from "./adaptor";
import { EnvInfoV2 } from "@microsoft/teamsfx-api/build/v2";
import { fillInCommonQuestions } from "../commonQuestions";
import { TransparentDataEncryptionActivitiesListByConfigurationResponse } from "@azure/arm-sql/esm/models";
import { askTargetEnvironment } from "../../../../core/middleware/envInfoLoader";

export async function provisionResource(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: EnvInfoV2,
  tokenProvider: TokenProvider
): Promise<v2.FxResult<v2.SolutionProvisionOutput, FxError>> {
  const blockResult = blockV1Project(ctx.projectSetting.solutionSettings);
  if (blockResult.isErr()) {
    return new v2.FxFailure(blockResult.error);
  }

  const azureSolutionSettings = getAzureSolutionSettings(ctx);
  // Just to trigger M365 login before the concurrent execution of provision.
  // Because concurrent exectution of provision may getAccessToken() concurrently, which
  // causes 2 M365 logins before the token caching in common lib takes effect.
  await tokenProvider.appStudioToken.getAccessToken();

  if (isAzureProject(azureSolutionSettings)) {
    const result = await ensurePermissionRequest(
      azureSolutionSettings,
      ctx.permissionRequestProvider
    );
    if (result.isErr()) {
      return new v2.FxFailure(result.error);
    }
  }

  if (isAzureProject(azureSolutionSettings)) {
    const appName = ctx.projectSetting.appName;
    const contextAdaptor = new ProvisionContextAdapter([ctx, inputs, envInfo, tokenProvider]);
    const res = await fillInCommonQuestions(
      contextAdaptor,
      appName,
      contextAdaptor.envInfo.profile,
      tokenProvider.azureAccountProvider,
      await tokenProvider.appStudioToken.getJsonObject()
    );
    if (res.isErr()) {
      return new v2.FxFailure(res.error);
    }
    // contextAdaptor deep-copies original JSON into a map. We need to convert it back.
    envInfo.profile = (contextAdaptor.envInfo.profile as ConfigMap).toJSON();
    const consentResult = await askForProvisionConsent(contextAdaptor);
    if (consentResult.isErr()) {
      return new v2.FxFailure(consentResult.error);
    }
  }

  const plugins = getSelectedPlugins(azureSolutionSettings);
  const provisionThunks = plugins
    .filter((plugin) => !isUndefined(plugin.provisionResource))
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "provisionResource",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        thunk: () =>
          plugin.deploy!(
            ctx,
            { ...inputs, ...extractSolutionInputs(provisionOutputs[GLOBAL_CONFIG]) },
            provisionOutputs[plugin.name],
            tokenProvider
          ),
      };
    });

  ctx.logProvider?.info(
    util.format(getStrings().solution.ProvisionStartNotice, PluginDisplayName.Solution)
  );
}

export async function askForProvisionConsent(ctx: SolutionContext): Promise<Result<Void, FxError>> {
  const azureToken = await ctx.azureAccountProvider?.getAccountCredentialAsync();

  // Only Azure project requires this confirm dialog
  const username = (azureToken as any).username ? (azureToken as any).username : "";
  const subscriptionId = ctx.envInfo.profile.get(GLOBAL_CONFIG)?.get(SUBSCRIPTION_ID) as string;
  const subscriptionName = ctx.envInfo.profile.get(GLOBAL_CONFIG)?.get(SUBSCRIPTION_NAME) as string;

  const msg = util.format(
    getStrings().solution.ProvisionConfirmNotice,
    username,
    subscriptionName ? subscriptionName : subscriptionId
  );
  let confirmRes = undefined;
  if (isMultiEnvEnabled()) {
    const msgNew = util.format(
      getStrings().solution.ProvisionConfirmEnvNotice,
      ctx.projectSettings!.activeEnvironment,
      username,
      subscriptionName ? subscriptionName : subscriptionId
    );
    confirmRes = await ctx.ui?.showMessage(
      "warn",
      msgNew,
      true,
      "Provision",
      "Switch environment",
      "Pricing calculator"
    );
  } else {
    confirmRes = await ctx.ui?.showMessage("warn", msg, true, "Provision", "Pricing calculator");
  }
  const confirm = confirmRes?.isOk() ? confirmRes.value : undefined;

  if (confirm !== "Provision") {
    if (confirm === "Pricing calculator") {
      ctx.ui?.openUrl("https://azure.microsoft.com/en-us/pricing/calculator/");
    } else if (confirm === "Switch environment") {
      const envName = await askTargetEnvironment(ctx as any, ctx.answers!);
      if (envName) {
        ctx.projectSettings!.activeEnvironment = envName;
        ctx.ui?.showMessage(
          "info",
          `[${envName}] is activated. Please try to do provision again.`,
          false
        );
      }
    }
    return err(
      returnUserError(
        new Error(getStrings().solution.CancelProvision),
        "Solution",
        getStrings().solution.CancelProvision
      )
    );
  }
  return ok(Void);
}
