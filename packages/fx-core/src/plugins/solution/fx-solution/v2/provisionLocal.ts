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
import { PluginNames, SolutionError } from "../constants";
import { isUndefined } from "lodash";
import Container from "typedi";
import { ResourcePluginsV2 } from "../ResourcePluginContainer";

export async function provisionLocalResource(
  ctx: v2.Context,
  inputs: Inputs,
  localSettings: Json,
  tokenProvider: TokenProvider
): Promise<Result<Void, FxError>> {
  const azureSolutionSettings = getAzureSolutionSettings(ctx);
  const result = await ensurePermissionRequest(
    azureSolutionSettings,
    ctx.permissionRequestProvider
  );
  if (result.isErr()) {
    return err(result.error);
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
  if (provisionResult.isErr()) {
    return err(provisionResult.error);
  }

  const aadPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AadPlugin);
  if (plugins.some((plugin) => plugin.name === aadPlugin.name) && aadPlugin.executeUserTask) {
    const result = await aadPlugin.executeUserTask(ctx, inputs, {
      namespace: `${PluginNames.SOLUTION}/${PluginNames.AAD}`,
      method: "setApplicationInContext",
      params: { isLocal: true },
    });
    if (result.isErr()) {
      return err(result.error);
    }
  } else {
    return err(
      returnSystemError(
        new Error("AAD plugin not selected or executeUserTask is undefined"),
        "Solution",
        SolutionError.InternelError
      )
    );
  }

  const parseTenantIdresult = loadTeamsAppTenantIdForLocal(
    localSettings as v2.LocalSettings,
    await tokenProvider.appStudioToken.getJsonObject()
  );
  if (parseTenantIdresult.isErr()) {
    return err(parseTenantIdresult.error);
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
  if (configureResourceResult.isErr()) {
    return err(configureResourceResult.error);
  }

  return ok(Void);
}
