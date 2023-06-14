// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AppPackageFolderName,
  AzureAccountProvider,
  AzureSolutionSettings,
  ConfigFolderName,
  ConfigMap,
  FxError,
  Json,
  M365TokenProvider,
  OptionItem,
  ProjectSettings,
  Result,
  SubscriptionInfo,
  SystemError,
  UserError,
  UserInteraction,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import axios from "axios";
import { ExecOptions, exec } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs-extra";
import * as Handlebars from "handlebars";
import _ from "lodash";
import Mustache from "mustache";
import * as path from "path";
import { promisify } from "util";
import * as uuid from "uuid";
import { parse } from "yaml";
import { SolutionError } from "../component/constants";
import { AppStudioClient } from "../component/driver/teamsApp/clients/appStudioClient";
import { AuthSvcClient } from "../component/driver/teamsApp/clients/authSvcClient";
import { getAppStudioEndpoint } from "../component/resource/appManifest/constants";
import { manifestUtils } from "../component/resource/appManifest/utils/ManifestUtils";
import { AppStudioClient as BotAppStudioClient } from "../component/resource/botService/appStudio/appStudioClient";
import { FailedToParseResourceIdError } from "../core/error";
import { getProjectSettingPathV3 } from "../core/middleware/projectSettingsLoader";
import { assembleError } from "../error/common";
import { FeatureFlagName, OfficeClientId, OutlookClientId, TeamsClientId } from "./constants";
import { isFeatureFlagEnabled } from "./featureFlags";
import { getDefaultString, getLocalizedString } from "./localizeUtils";
import { getProjectTemplatesFolderPath } from "./utils";

Handlebars.registerHelper("contains", (value, array) => {
  array = array instanceof Array ? array : [array];
  return array.indexOf(value) > -1 ? this : "";
});
Handlebars.registerHelper("notContains", (value, array) => {
  array = array instanceof Array ? array : [array];
  return array.indexOf(value) == -1 ? this : "";
});
Handlebars.registerHelper("equals", (value, target) => {
  return value === target ? this : "";
});

const CryptoDataMatchers = new Set([
  "fx-resource-aad-app-for-teams.clientSecret",
  "fx-resource-aad-app-for-teams.local_clientSecret",
  "fx-resource-simple-auth.environmentVariableParams",
  "fx-resource-bot.botPassword",
  "fx-resource-bot.localBotPassword",
  "fx-resource-apim.apimClientAADClientSecret",
  "fx-resource-azure-sql.adminPassword",
]);

const AzurePortalUrl = "https://portal.azure.com";

/**
 * Only data related to secrets need encryption.
 * @param key - the key name of data in user data file
 * @returns whether it needs encryption
 */
export function dataNeedEncryption(key: string): boolean {
  return CryptoDataMatchers.has(key);
}

export function convertDotenvToEmbeddedJson(dict: Record<string, string>): Json {
  const result: Json = {};
  for (const key of Object.keys(dict)) {
    const array = key.split(".");
    let obj = result;
    for (let i = 0; i < array.length - 1; ++i) {
      const subKey = array[i];
      let subObj = obj[subKey];
      if (!subObj) {
        subObj = {};
        obj[subKey] = subObj;
      }
      obj = subObj;
    }
    obj[array[array.length - 1]] = dict[key];
  }
  return result;
}

export function replaceTemplateWithUserData(
  template: string,
  userData: Record<string, string>
): string {
  const view = convertDotenvToEmbeddedJson(userData);
  Mustache.escape = (t: string) => {
    if (!t) {
      return t;
    }
    const str = JSON.stringify(t);
    return str.substr(1, str.length - 2);
    // return t;
  };
  const result = Mustache.render(template, view);
  return result;
}

export function serializeDict(dict: Record<string, string>): string {
  const array: string[] = [];
  for (const key of Object.keys(dict)) {
    const value = dict[key];
    array.push(`${key}=${value}`);
  }
  return array.join("\n");
}

export const deepCopy = <T>(target: T): T => {
  if (target === null) {
    return target;
  }
  if (target instanceof Date) {
    return new Date(target.getTime()) as any;
  }
  if (target instanceof Array) {
    const cp = [] as any[];
    (target as any[]).forEach((v) => {
      cp.push(v);
    });
    return cp.map((n: any) => deepCopy<any>(n)) as any;
  }
  if (typeof target === "object" && target !== {}) {
    const cp = { ...(target as { [key: string]: any }) } as {
      [key: string]: any;
    };
    Object.keys(cp).forEach((k) => {
      cp[k] = deepCopy<any>(cp[k]);
    });
    return cp as T;
  }
  return target;
};

export function isUserCancelError(error: Error): boolean {
  const errorName = "name" in error ? (error as any)["name"] : "";
  return (
    errorName === "User Cancel" || errorName === "CancelProvision" || errorName === "UserCancel"
  );
}

export function isCheckAccountError(error: Error): boolean {
  const errorName = "name" in error ? (error as any)["name"] : "";
  return (
    errorName === SolutionError.TeamsAppTenantIdNotRight ||
    errorName === SolutionError.SubscriptionNotFound
  );
}

export async function askSubscription(
  azureAccountProvider: AzureAccountProvider,
  ui: UserInteraction,
  activeSubscriptionId?: string
): Promise<Result<SubscriptionInfo, FxError>> {
  const subscriptions: SubscriptionInfo[] = await azureAccountProvider.listSubscriptions();

  if (subscriptions.length === 0) {
    return err(
      new UserError(
        "Core",
        "NoSubscriptionFound",
        getDefaultString("error.NoSubscriptionFound"),
        getLocalizedString("error.NoSubscriptionFound")
      )
    );
  }
  let resultSub = subscriptions.find((sub) => sub.subscriptionId === activeSubscriptionId);
  if (activeSubscriptionId === undefined || resultSub === undefined) {
    let selectedSub: SubscriptionInfo | undefined = undefined;
    if (subscriptions.length === 1) {
      selectedSub = subscriptions[0];
    } else {
      const options: OptionItem[] = subscriptions.map((sub) => {
        return {
          id: sub.subscriptionId,
          label: sub.subscriptionName,
          data: sub.tenantId,
        } as OptionItem;
      });
      const askRes = await ui.selectOption({
        name: "subscription",
        title: "Select a subscription",
        options: options,
        returnObject: true,
      });
      if (askRes.isErr()) return err(askRes.error);
      const subItem = askRes.value.result as OptionItem;
      selectedSub = {
        subscriptionId: subItem.id,
        subscriptionName: subItem.label,
        tenantId: subItem.data as string,
      };
    }
    if (selectedSub === undefined) {
      return err(
        new SystemError(
          "Core",
          "NoSubscriptionFound",
          getDefaultString("error.NoSubscriptionFound"),
          getLocalizedString("error.NoSubscriptionFound")
        )
      );
    }
    resultSub = selectedSub;
  }
  return ok(resultSub);
}

export function getResourceGroupInPortal(
  subscriptionId?: string,
  tenantId?: string,
  resourceGroupName?: string
): string | undefined {
  if (subscriptionId && tenantId && resourceGroupName) {
    return `${AzurePortalUrl}/#@${tenantId}/resource/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}`;
  } else {
    return undefined;
  }
}

export function isV3Enabled(): boolean {
  return process.env.TEAMSFX_V3 ? process.env.TEAMSFX_V3 === "true" : true;
}

export function isVideoFilterEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.VideoFilter, false);
}

export function isImportSPFxEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.ImportSPFx, false);
}

export function compileHandlebarsTemplateString(templateString: string, context: any): string {
  const template = Handlebars.compile(templateString);
  return template(context);
}

export async function getAppDirectory(projectRoot: string): Promise<string> {
  const REMOTE_MANIFEST = "manifest.source.json";
  const appDirNewLocForMultiEnv = path.resolve(
    await getProjectTemplatesFolderPath(projectRoot),
    AppPackageFolderName
  );
  const appDirNewLoc = path.join(projectRoot, AppPackageFolderName);
  const appDirOldLoc = path.join(projectRoot, `.${ConfigFolderName}`);
  if (await fs.pathExists(appDirNewLocForMultiEnv)) {
    return appDirNewLocForMultiEnv;
  } else if (await fs.pathExists(path.join(appDirNewLoc, REMOTE_MANIFEST))) {
    return appDirNewLoc;
  } else {
    return appDirOldLoc;
  }
}

export function getSiteNameFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(/providers\/Microsoft.Web\/sites\/([^\/]*)/i, resourceId);
  if (!result) {
    throw FailedToParseResourceIdError("site name", resourceId);
  }
  return result;
}

export function getResourceGroupNameFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(/\/resourceGroups\/([^\/]*)\//i, resourceId);
  if (!result) {
    throw FailedToParseResourceIdError("resource group name", resourceId);
  }
  return result;
}

export function getSubscriptionIdFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(/\/subscriptions\/([^\/]*)\//i, resourceId);
  if (!result) {
    throw FailedToParseResourceIdError("subscription id", resourceId);
  }
  return result;
}

export function parseFromResourceId(pattern: RegExp, resourceId: string): string {
  const result = resourceId.match(pattern);
  return result ? result[1].trim() : "";
}

export async function waitSeconds(second: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, second * 1000));
}

export function getUuid(): string {
  return uuid.v4();
}

export function isSPFxProject(projectSettings?: ProjectSettings): boolean {
  const solutionSettings = projectSettings?.solutionSettings as AzureSolutionSettings;
  if (solutionSettings) {
    const selectedPlugins = solutionSettings.activeResourcePlugins;
    return selectedPlugins && selectedPlugins.indexOf("fx-resource-spfx") !== -1;
  }
  return false;
}

export async function isVideoFilterProject(projectPath: string): Promise<Result<boolean, FxError>> {
  let manifestResult;
  try {
    manifestResult = await manifestUtils.readAppManifest(projectPath);
  } catch (e) {
    return err(assembleError(e));
  }
  if (manifestResult.isErr()) {
    return err(manifestResult.error);
  }
  const manifest = manifestResult.value;
  return ok(
    (manifest.meetingExtensionDefinition as any)?.videoFiltersConfigurationUrl !== undefined
  );
}

export function getHashedEnv(envName: string): string {
  return crypto.createHash("sha256").update(envName).digest("hex");
}

export function getAllowedAppIds(): string[] {
  return [
    TeamsClientId.MobileDesktop,
    TeamsClientId.Web,
    OfficeClientId.Desktop,
    OfficeClientId.Web1,
    OfficeClientId.Web2,
    OutlookClientId.Desktop,
    OutlookClientId.Web1,
    OutlookClientId.Web2,
  ];
}

export function getAllowedAppMaps(): Record<string, string> {
  return {
    [TeamsClientId.MobileDesktop]: getLocalizedString("core.common.TeamsMobileDesktopClientName"),
    [TeamsClientId.Web]: getLocalizedString("core.common.TeamsWebClientName"),
    [OfficeClientId.Desktop]: getLocalizedString("core.common.OfficeDesktopClientName"),
    [OfficeClientId.Web1]: getLocalizedString("core.common.OfficeWebClientName1"),
    [OfficeClientId.Web2]: getLocalizedString("core.common.OfficeWebClientName2"),
    [OutlookClientId.Desktop]: getLocalizedString("core.common.OutlookDesktopClientName"),
    [OutlookClientId.Web1]: getLocalizedString("core.common.OutlookWebClientName1"),
    [OutlookClientId.Web2]: getLocalizedString("core.common.OutlookWebClientName2"),
  };
}

export async function getSideloadingStatus(token: string): Promise<boolean | undefined> {
  return AppStudioClient.getSideloadingStatus(token);
}

export const AppStudioScopes = [`${getAppStudioEndpoint()}/AppDefinitions.ReadWrite`];
export const AuthSvcScopes = ["https://api.spaces.skype.com/Region.ReadWrite"];
export const GraphScopes = ["Application.ReadWrite.All", "TeamsAppInstallation.ReadForUser"];
export const GraphReadUserScopes = ["https://graph.microsoft.com/User.ReadBasic.All"];
export const SPFxScopes = (tenant: string) => [`${tenant}/Sites.FullControl.All`];
export const AzureScopes = ["https://management.core.windows.net/user_impersonation"];

export async function getSPFxTenant(graphToken: string): Promise<string> {
  const GRAPH_TENANT_ENDPT = "https://graph.microsoft.com/v1.0/sites/root?$select=webUrl";
  if (graphToken.length > 0) {
    const response = await axios.get(GRAPH_TENANT_ENDPT, {
      headers: { Authorization: `Bearer ${graphToken}` },
    });
    return response.data.webUrl;
  }
  return "";
}

export async function getSPFxToken(
  m365TokenProvider: M365TokenProvider
): Promise<string | undefined> {
  const graphTokenRes = await m365TokenProvider.getAccessToken({
    scopes: GraphReadUserScopes,
  });
  let spoToken = undefined;
  if (graphTokenRes && graphTokenRes.isOk()) {
    const tenant = await getSPFxTenant(graphTokenRes.value);
    const spfxTokenRes = await m365TokenProvider.getAccessToken({
      scopes: SPFxScopes(tenant),
    });
    spoToken = spfxTokenRes.isOk() ? spfxTokenRes.value : undefined;
  }
  return spoToken;
}

/**
 * Get and set regin for App Studio client
 * @param m365TokenProvider
 */
export async function setRegion(authSvcToken: string) {
  const region = await AuthSvcClient.getRegion(authSvcToken);
  if (region) {
    AppStudioClient.setRegion(region);
    BotAppStudioClient.setRegion(region);
  }
}

export function ConvertTokenToJson(token: string): Record<string, unknown> {
  const array = token.split(".");
  const buff = Buffer.from(array[1], "base64");
  return JSON.parse(buff.toString("utf8"));
}

export function getFixedCommonProjectSettings(rootPath: string | undefined) {
  if (!rootPath) {
    return undefined;
  }
  try {
    const settingsPath = getProjectSettingPathV3(rootPath);

    if (!settingsPath || !fs.pathExistsSync(settingsPath)) {
      return undefined;
    }

    const settingsContent = fs.readFileSync(settingsPath, "utf-8");
    const settings = parse(settingsContent);
    return {
      projectId: settings?.projectId ?? undefined,
    };
  } catch {
    return undefined;
  }
}
