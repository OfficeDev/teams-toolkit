import {
  err,
  FxError,
  Json,
  ok,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { isUndefined } from "lodash";
import { Container } from "typedi";
import { LocalSettingsTeamsAppKeys } from "../../../../common/local/constants";
import { PermissionRequestFileProvider } from "../../../../core/permissionRequest";
import { configLocalDebugSettings, setupLocalDebugSettings } from "../debug/provisionLocal";
import { executeConcurrently } from "../v2/executor";
import {
  checkWhetherLocalDebugM365TenantMatches,
  ensurePermissionRequest,
  loadTeamsAppTenantIdForLocal,
} from "../v2/utils";

export async function getQuestionsForLocalProvision(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  tokenProvider: TokenProvider,
  localSettings?: v2.DeepReadonly<Json>
): Promise<Result<QTreeNode | undefined, FxError>> {
  return ok(undefined);
}
export async function provisionLocalResources(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  localSettings: Json,
  tokenProvider: TokenProvider
): Promise<Result<Json, FxError>> {
  if (ctx.permissionRequestProvider === undefined) {
    ctx.permissionRequestProvider = new PermissionRequestFileProvider(inputs.projectPath);
  }
  const azureSolutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  // TODO permission.json is required?
  // const result = await ensurePermissionRequest(
  //   azureSolutionSettings,
  //   ctx.permissionRequestProvider
  // );
  // if (result.isErr()) {
  //   return err(result.error);
  // }

  // Just to trigger M365 login before the concurrent execution of localDebug.
  // Because concurrent execution of localDebug may getAccessToken() concurrently, which
  // causes 2 M365 logins before the token caching in common lib takes effect.
  await tokenProvider.appStudioToken.getAccessToken();

  const v2localSettings = localSettings as v2.LocalSettings;
  // Pop-up window to confirm if local debug in another tenant
  const localDebugTenantId = v2localSettings.teamsApp[LocalSettingsTeamsAppKeys.TenantId];
  const m365TenantMatches = await checkWhetherLocalDebugM365TenantMatches(
    localDebugTenantId,
    tokenProvider.appStudioToken
  );
  if (m365TenantMatches.isErr()) {
    return err(m365TenantMatches.error);
  }

  const plugins: v3.ResourcePlugin[] = azureSolutionSettings.activeResourcePlugins.map((n) =>
    Container.get<v3.ResourcePlugin>(n)
  );
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
    return err(provisionResult.error);
  }

  const debugProvisionResult = await setupLocalDebugSettings(ctx, inputs, localSettings);

  if (debugProvisionResult.isErr()) {
    return err(debugProvisionResult.error);
  }

  // if AAD is enabled TODO
  // const aadPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AadPlugin);
  // if (isAzureProject(azureSolutionSettings)) {
  //   if (plugins.some((plugin) => plugin.name === aadPlugin.name) && aadPlugin.executeUserTask) {
  //     const result = await aadPlugin.executeUserTask(
  //       ctx,
  //       inputs,
  //       {
  //         namespace: `${PluginNames.SOLUTION}/${PluginNames.AAD}`,
  //         method: "setApplicationInContext",
  //         params: { isLocal: true },
  //       },
  //       localSettings,
  //       { envName: environmentManager.getDefaultEnvName(), config: {}, state: {} },
  //       tokenProvider
  //     );
  //     if (result.isErr()) {
  //       return new v2.FxPartialSuccess(localSettings, result.error);
  //     }
  //   } else {
  //     if (!ctx.projectSetting.solutionSettings.migrateFromV1) {
  //       return new v2.FxFailure(
  //         returnSystemError(
  //           new Error("AAD plugin not selected or executeUserTask is undefined"),
  //           SolutionSource,
  //           SolutionError.InternelError
  //         )
  //       );
  //     }
  //   }
  // }

  const parseTenantIdResult = loadTeamsAppTenantIdForLocal(
    localSettings as v2.LocalSettings,
    await tokenProvider.appStudioToken.getJsonObject()
  );
  if (parseTenantIdResult.isErr()) {
    return err(parseTenantIdResult.error);
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
    return err(configureResourceResult.error);
  }

  const configLocalDebugSettingsRes = await configLocalDebugSettings(ctx, inputs, localSettings);

  if (configLocalDebugSettingsRes.isErr()) {
    return err(configLocalDebugSettingsRes.error);
  }
  return ok(localSettings);
}
