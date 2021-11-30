import {
  v2,
  Inputs,
  FxError,
  Result,
  ok,
  err,
  AzureSolutionSettings,
  Void,
  returnUserError,
  PermissionRequestProvider,
  returnSystemError,
  SolutionSettings,
  Json,
  SolutionContext,
  Plugin,
} from "@microsoft/teamsfx-api";
import { LocalSettingsTeamsAppKeys } from "../../../../common/localSettingsConstants";
import {
  GLOBAL_CONFIG,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
  SolutionSource,
} from "../constants";
import {
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceSQL,
  AzureSolutionQuestionNames,
  BotOptionItem,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  MessageExtensionItem,
  TabOptionItem,
  TabSPFxItem,
} from "../question";
import { getActivatedV2ResourcePlugins } from "../ResourcePluginContainer";
import { PluginsWithContext } from "../solution";
import { getPluginContext } from "../utils/util";

export function getSelectedPlugins(azureSettings: AzureSolutionSettings): v2.ResourcePlugin[] {
  const plugins = getActivatedV2ResourcePlugins(azureSettings);
  azureSettings.activeResourcePlugins = plugins.map((p) => p.name);
  return plugins;
}

export function getAzureSolutionSettings(ctx: v2.Context): AzureSolutionSettings {
  return ctx.projectSetting.solutionSettings as AzureSolutionSettings;
}

export function isAzureProject(azureSettings: AzureSolutionSettings): boolean {
  return HostTypeOptionAzure.id === azureSettings.hostType;
}

export function combineRecords<T>(records: { name: string; result: T }[]): Record<string, T> {
  const ret: Record<v2.PluginName, T> = {};
  for (const record of records) {
    ret[record.name] = record.result;
  }

  return ret;
}

export function extractSolutionInputs(record: Json): v2.SolutionInputs {
  return {
    resourceNameSuffix: record["resourceNameSuffix"],
    resourceGroupName: record["resourceGroupName"],
    location: record["location"],
    teamsAppTenantId: record["teamsAppTenantId"],
    remoteTeamsAppId: undefined,
    subscriptionId: record["subscriptionId"],
    provisionSucceeded: record[SOLUTION_PROVISION_SUCCEEDED],
    tenantId: record["tenantId"],
  };
}

export function reloadV2Plugins(solutionSettings: AzureSolutionSettings): v2.ResourcePlugin[] {
  const res = getActivatedV2ResourcePlugins(solutionSettings);
  solutionSettings.activeResourcePlugins = res.map((p) => p.name);
  return res;
}

export async function ensurePermissionRequest(
  solutionSettings: AzureSolutionSettings,
  permissionRequestProvider: PermissionRequestProvider
): Promise<Result<Void, FxError>> {
  if (solutionSettings.migrateFromV1) {
    return ok(Void);
  }

  if (!isAzureProject(solutionSettings)) {
    return err(
      returnUserError(
        new Error("Cannot update permission for SPFx project"),
        SolutionSource,
        SolutionError.CannotUpdatePermissionForSPFx
      )
    );
  }

  const result = await permissionRequestProvider.checkPermissionRequest();
  if (result && result.isErr()) {
    return result.map(err);
  }

  return ok(Void);
}

export function parseTeamsAppTenantId(
  appStudioToken?: Record<string, unknown>
): Result<string, FxError> {
  if (appStudioToken === undefined) {
    return err(
      returnSystemError(
        new Error("Graph token json is undefined"),
        SolutionSource,
        SolutionError.NoAppStudioToken
      )
    );
  }

  const teamsAppTenantId = appStudioToken["tid"];
  if (
    teamsAppTenantId === undefined ||
    !(typeof teamsAppTenantId === "string") ||
    teamsAppTenantId.length === 0
  ) {
    return err(
      returnSystemError(
        new Error("Cannot find teams app tenant id"),
        SolutionSource,
        SolutionError.NoTeamsAppTenantId
      )
    );
  }
  return ok(teamsAppTenantId);
}

export function parseUserName(appStudioToken?: Record<string, unknown>): Result<string, FxError> {
  if (appStudioToken === undefined) {
    return err(
      returnSystemError(
        new Error("Graph token json is undefined"),
        "Solution",
        SolutionError.NoAppStudioToken
      )
    );
  }

  const userName = appStudioToken["upn"];
  if (userName === undefined || !(typeof userName === "string") || userName.length === 0) {
    return err(
      returnSystemError(
        new Error("Cannot find user name from App Studio token."),
        "Solution",
        SolutionError.NoUserName
      )
    );
  }
  return ok(userName);
}

// Loads teams app tenant id into local settings.
export function loadTeamsAppTenantIdForLocal(
  localSettings: v2.LocalSettings,
  appStudioToken?: Record<string, unknown>
): Result<Void, FxError> {
  return parseTeamsAppTenantId(appStudioToken as Record<string, unknown> | undefined).andThen(
    (teamsAppTenantId) => {
      localSettings.teamsApp[LocalSettingsTeamsAppKeys.TenantId] = teamsAppTenantId;
      return ok(Void);
    }
  );
}

export function fillInSolutionSettings(
  solutionSettings: AzureSolutionSettings,
  answers: Inputs
): Result<Void, FxError> {
  let capabilities = (answers[AzureSolutionQuestionNames.Capabilities] as string[]) || [];
  if (!capabilities || capabilities.length === 0) {
    return err(
      returnSystemError(
        new Error("capabilities is empty"),
        SolutionSource,
        SolutionError.InternelError
      )
    );
  }
  let hostType = answers[AzureSolutionQuestionNames.HostType] as string;
  if (
    capabilities.includes(BotOptionItem.id) ||
    capabilities.includes(MessageExtensionItem.id) ||
    capabilities.includes(TabOptionItem.id)
  ) {
    hostType = HostTypeOptionAzure.id;
  } else if (capabilities.includes(TabSPFxItem.id)) {
    // set capabilities to TabOptionItem in case of TabSPFx item, so donot impact capabilities.includes() check overall
    capabilities = [TabOptionItem.id];
    hostType = HostTypeOptionSPFx.id;
  }
  if (!hostType) {
    return err(
      returnSystemError(
        new Error("hostType is undefined"),
        SolutionSource,
        SolutionError.InternelError
      )
    );
  }
  solutionSettings.hostType = hostType;
  let azureResources: string[] | undefined;
  if (hostType === HostTypeOptionAzure.id && capabilities.includes(TabOptionItem.id)) {
    azureResources = answers[AzureSolutionQuestionNames.AzureResources] as string[];
    if (azureResources) {
      if (
        (azureResources.includes(AzureResourceSQL.id) ||
          azureResources.includes(AzureResourceApim.id)) &&
        !azureResources.includes(AzureResourceFunction.id)
      ) {
        azureResources.push(AzureResourceFunction.id);
      }
    } else azureResources = [];
  }
  solutionSettings.azureResources = azureResources || [];
  solutionSettings.capabilities = capabilities || [];
  return ok(Void);
}

export function checkWetherProvisionSucceeded(config: Json): boolean {
  return config[GLOBAL_CONFIG] && config[GLOBAL_CONFIG][SOLUTION_PROVISION_SUCCEEDED];
}

export function getPluginAndContextArray(
  ctx: SolutionContext,
  selectedPlugins: Plugin[]
): PluginsWithContext[] {
  return selectedPlugins.map((plugin) => [plugin, getPluginContext(ctx, plugin.name)]);
}
