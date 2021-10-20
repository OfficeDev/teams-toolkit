import {
  v2,
  Inputs,
  FxError,
  Result,
  ok,
  err,
  TokenProvider,
  returnSystemError,
  Void,
  Json,
} from "@microsoft/teamsfx-api";
import { executeConcurrently } from "./executor";
import {
  ensurePermissionRequest,
  getAzureSolutionSettings,
  getSelectedPlugins,
  loadTeamsAppTenantIdForLocal,
} from "./utils";
import { PluginNames, SolutionError, SolutionSource } from "../constants";
import { isUndefined } from "lodash";
import Container from "typedi";
import { ResourcePluginsV2 } from "../ResourcePluginContainer";
import { environmentManager } from "../../../../core/environment";
import { PermissionRequestFileProvider } from "../../../../core/permissionRequest";

export async function provisionLocalResource(
  ctx: v2.Context,
  inputs: Inputs,
  localSettings: Json,
  tokenProvider: TokenProvider
): Promise<v2.FxResult<Json, FxError>> {
  if (inputs.projectPath === undefined) {
    return new v2.FxFailure(
      returnSystemError(
        new Error("projectPath is undefined"),
        "Solution",
        SolutionError.InternelError
      )
    );
  }
  const azureSolutionSettings = getAzureSolutionSettings(ctx);
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

  // Just to trigger M365 login before the concurrent execution of localDebug.
  // Because concurrent execution of localDebug may getAccessToken() concurrently, which
  // causes 2 M365 logins before the token caching in common lib takes effect.
  await tokenProvider.appStudioToken.getAccessToken();

  const plugins: v2.ResourcePlugin[] = getSelectedPlugins(azureSolutionSettings);
  const provisionLocalResourceThunks = plugins
    .filter((plugin) => !isUndefined(plugin.provisionLocalResource))
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "provisionLocalResource",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        thunk: () => plugin.provisionLocalResource!(ctx, inputs, localSettings, tokenProvider),
      };
    });

  const provisionResult = await executeConcurrently(provisionLocalResourceThunks, ctx.logProvider);
  if (provisionResult.kind !== "success") {
    return provisionResult;
  }

  const aadPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AadPlugin);
  if (plugins.some((plugin) => plugin.name === aadPlugin.name) && aadPlugin.executeUserTask) {
    const result = await aadPlugin.executeUserTask(
      ctx,
      inputs,
      {
        namespace: `${PluginNames.SOLUTION}/${PluginNames.AAD}`,
        method: "setApplicationInContext",
        params: { isLocal: true },
      },
      localSettings,
      { envName: environmentManager.getDefaultEnvName(), config: {}, state: {} },
      tokenProvider
    );
    if (result.isErr()) {
      return new v2.FxPartialSuccess(localSettings, result.error);
    }
  } else {
    return new v2.FxFailure(
      returnSystemError(
        new Error("AAD plugin not selected or executeUserTask is undefined"),
        SolutionSource,
        SolutionError.InternelError
      )
    );
  }

  const parseTenantIdresult = loadTeamsAppTenantIdForLocal(
    localSettings as v2.LocalSettings,
    await tokenProvider.appStudioToken.getJsonObject()
  );
  if (parseTenantIdresult.isErr()) {
    return new v2.FxFailure(parseTenantIdresult.error);
  }

  const configureLocalResourceThunks = plugins
    .filter((plugin) => !isUndefined(plugin.configureLocalResource))
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "configureLocalResource",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        thunk: () => plugin.configureLocalResource!(ctx, inputs, localSettings, tokenProvider),
      };
    });

  const configureResourceResult = await executeConcurrently(
    configureLocalResourceThunks,
    ctx.logProvider
  );
  if (configureResourceResult.kind !== "success") {
    if (configureResourceResult.kind === "partialSuccess") {
      return new v2.FxPartialSuccess(localSettings, configureResourceResult.error);
    }
    return new v2.FxFailure(configureResourceResult.error);
  }

  return new v2.FxSuccess(localSettings);
}
