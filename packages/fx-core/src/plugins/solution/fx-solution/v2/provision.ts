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
} from "@microsoft/teamsfx-api";
import { getStrings } from "../../../../common/tools";
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
import { GLOBAL_CONFIG, SolutionError, SOLUTION_PROVISION_SUCCEEDED } from "../constants";
import * as util from "util";
import { AzureSolutionQuestionNames } from "../question";
import { isUndefined } from "lodash";
import { PluginDisplayName } from "../../../../common/constants";
import { PermissionRequestFileProvider } from "../../../../core/permissionRequest";

export async function provisionResource(
  ctx: v2.Context,
  inputs: Readonly<v2.ProvisionInputs>,
  provisionTemplates: Record<v2.PluginName, Json>,
  tokenProvider: TokenProvider
): Promise<Result<v2.ProvisionOutput, FxError>> {
  const blockResult = blockV1Project(ctx.projectSetting.solutionSettings);
  if (blockResult.isErr()) {
    return err(blockResult.error);
  }

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
      return err(result.error);
    }
  }
}
