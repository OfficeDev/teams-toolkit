import {
  err,
  FxError,
  Json,
  ok,
  QTreeNode,
  Result,
  TokenProvider,
  UserError,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { isUndefined } from "lodash";
import { Container } from "typedi";
import * as util from "util";
import { LocalSettingsTeamsAppKeys } from "../../../../common/localSettingsConstants";
import { getStrings } from "../../../../common/tools";
import { SolutionError } from "../constants";
import { configLocalDebugSettings, setupLocalDebugSettings } from "../debug/provisionLocal";
import { ResourcePluginsV2 } from "../ResourcePluginContainer";
import { executeConcurrently } from "../v2/executor";
import { getM365TenantId } from "./provision";
import { solutionGlobalVars } from "./solutionGlobalVars";

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
  const solutionSetting = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  // check M365 tenantId match
  const localSettingsV2 = localSettings as v2.LocalSettings;
  const tenantIdInConfig = localSettingsV2.teamsApp[LocalSettingsTeamsAppKeys.TenantId];
  const tenantIdInTokenRes = await getM365TenantId(tokenProvider.appStudioToken);
  if (tenantIdInTokenRes.isErr()) {
    return err(tenantIdInTokenRes.error);
  }
  const tenantIdInToken = tenantIdInTokenRes.value;
  if (tenantIdInConfig && tenantIdInToken && tenantIdInToken !== tenantIdInConfig) {
    const errorMessage: string = util.format(
      getStrings().solution.LocalDebugTenantConfirmNotice,
      tenantIdInConfig,
      tenantIdInToken,
      "localSettings.json"
    );
    return err(
      new UserError(SolutionError.CannotLocalDebugInDifferentTenant, errorMessage, "Solution")
    );
  }
  if (!tenantIdInConfig) {
    localSettingsV2.teamsApp[LocalSettingsTeamsAppKeys.TenantId] = tenantIdInToken;
  }

  //TODO teams app provision, return app id
  // call appStudio.provision()
  // localSettingsV2.teamsApp[LocalSettingsTeamsAppKeys.TeamsAppId] = "fake-local-teams-app-id";
  // solutionGlobalVars.TeamsAppId = "fake-local-teams-app-id";

  // provision resources for local debug
  const plugins: v3.ResourcePlugin[] = solutionSetting.activeResourcePlugins.map((n) =>
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

  const appStuioV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);
  if (appStuioV2.configureLocalResource) {
    const res = await appStuioV2.configureLocalResource(ctx, inputs, localSettings, tokenProvider);
    if (res.isErr()) {
      return err(res.error);
    }
  }

  return ok(localSettings);
}
