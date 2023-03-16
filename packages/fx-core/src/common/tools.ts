// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AppPackageFolderName,
  AzureAccountProvider,
  ConfigFolderName,
  ConfigMap,
  err,
  FxError,
  Json,
  ok,
  OptionItem,
  Result,
  SubscriptionInfo,
  SystemError,
  UserInteraction,
  ProjectSettings,
  AzureSolutionSettings,
  v2,
  UserError,
  TelemetryReporter,
  Void,
  Inputs,
  Platform,
  M365TokenProvider,
  ProjectSettingsV3,
  InputConfigsFolderName,
  ProjectSettingsFileName,
  SettingsFileName,
  SettingsFolderName,
  assembleError,
} from "@microsoft/teamsfx-api";
import axios from "axios";
import { exec, ExecOptions } from "child_process";
import * as fs from "fs-extra";
import * as Handlebars from "handlebars";
import { promisify } from "util";
import * as uuid from "uuid";
import {
  ConstantString,
  FeatureFlagName,
  TeamsClientId,
  OfficeClientId,
  OutlookClientId,
  ResourcePlugins,
} from "./constants";
import * as crypto from "crypto";
import { FailedToParseResourceIdError } from "../core/error";
import { PluginNames, SolutionError, SolutionSource } from "../component/constants";
import Mustache from "mustache";
import {
  HostTypeOptionAzure,
  TabSsoItem,
  BotSsoItem,
  BotOptionItem,
  TabOptionItem,
  MessageExtensionItem,
} from "../component/constants";
import { TOOLS } from "../core/globalVars";
import { LocalCrypto } from "../core/crypto";
import { getDefaultString, getLocalizedString } from "./localizeUtils";
import { isFeatureFlagEnabled } from "./featureFlags";
import _ from "lodash";
import { BotHostTypeName, BotHostTypes } from "./local/constants";
import { isExistingTabApp } from "./projectSettingsHelper";
import { ExistingTemplatesStat } from "../component/feature/cicd/existingTemplatesStat";
import { environmentManager } from "../core/environment";
import { NoProjectOpenedError } from "../component/feature/cicd/errors";
import { getProjectTemplatesFolderPath } from "./utils";
import * as path from "path";
import { isMiniApp } from "./projectSettingsHelperV3";
import { getAppStudioEndpoint } from "../component/resource/appManifest/constants";
import { manifestUtils } from "../component/resource/appManifest/utils/ManifestUtils";
import { AuthSvcClient } from "../component/resource/appManifest/authSvcClient";
import { AppStudioClient } from "../component/resource/appManifest/appStudioClient";
import { AppStudioClient as BotAppStudioClient } from "../component/resource/botService/appStudio/appStudioClient";
import { getProjectSettingPathV3 } from "../core/middleware/projectSettingsLoader";
import { parse } from "yaml";

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

export const Executor = {
  async execCommandAsync(command: string, options?: ExecOptions) {
    const execAsync = promisify(exec);
    return await execAsync(command, options);
  },
};

export async function npmInstall(path: string) {
  await Executor.execCommandAsync("npm install", {
    cwd: path,
  });
}

export async function ensureUniqueFolder(folderPath: string): Promise<string> {
  let folderId = 1;
  let testFolder = folderPath;

  let pathExists = await fs.pathExists(testFolder);
  while (pathExists) {
    testFolder = `${folderPath}${folderId}`;
    folderId++;

    pathExists = await fs.pathExists(testFolder);
  }

  return testFolder;
}

/**
 * Convert a `Map` to a Json recursively.
 * @param {Map} map to convert.
 * @returns {Json} converted Json.
 */
export function mapToJson(map?: Map<any, any>): Json {
  if (!map) return {};
  const out: Json = {};
  for (const entry of map.entries()) {
    if (entry[1] instanceof Map) {
      out[entry[0]] = mapToJson(entry[1]);
    } else {
      out[entry[0]] = entry[1];
    }
  }
  return out;
}

/**
 * Convert an `Object` to a Map recursively
 * @param {Json} Json to convert.
 * @returns {Map} converted Json.
 */
export function objectToMap(o: Json): Map<any, any> {
  const m = new Map();
  for (const entry of Object.entries(o)) {
    if (entry[1] instanceof Array) {
      m.set(entry[0], entry[1]);
    } else if (entry[1] instanceof Object) {
      m.set(entry[0], objectToConfigMap(entry[1] as Json));
    } else {
      m.set(entry[0], entry[1]);
    }
  }
  return m;
}

/**
 * @param {Json} Json to convert.
 * @returns {Map} converted Json.
 */
export function objectToConfigMap(o?: Json): ConfigMap {
  const m = new ConfigMap();
  if (o) {
    for (const entry of Object.entries(o)) {
      {
        m.set(entry[0], entry[1]);
      }
    }
  }
  return m;
}

const SecretDataMatchers = [
  "fx-resource-aad-app-for-teams.clientSecret",
  "fx-resource-simple-auth.filePath",
  "fx-resource-simple-auth.environmentVariableParams",
  "fx-resource-local-debug.*",
  "fx-resource-bot.botPassword",
  "fx-resource-apim.apimClientAADClientSecret",
  "fx-resource-azure-sql.adminPassword",
];

export const CryptoDataMatchers = new Set([
  "fx-resource-aad-app-for-teams.clientSecret",
  "fx-resource-aad-app-for-teams.local_clientSecret",
  "fx-resource-simple-auth.environmentVariableParams",
  "fx-resource-bot.botPassword",
  "fx-resource-bot.localBotPassword",
  "fx-resource-apim.apimClientAADClientSecret",
  "fx-resource-azure-sql.adminPassword",
]);

export const AzurePortalUrl = "https://portal.azure.com";

/**
 * Only data related to secrets need encryption.
 * @param key - the key name of data in user data file
 * @returns whether it needs encryption
 */
export function dataNeedEncryption(key: string): boolean {
  return CryptoDataMatchers.has(key);
}

export function separateSecretData(configJson: Json): Record<string, string> {
  const res: Record<string, string> = {};
  for (const matcher of SecretDataMatchers) {
    const splits = matcher.split(".");
    const resourceId = splits[0];
    const item = splits[1];
    const resourceConfig: any = configJson[resourceId];
    if (!resourceConfig) continue;
    if ("*" !== item) {
      const configValue = resourceConfig[item];
      if (configValue) {
        const keyName = `${resourceId}.${item}`;
        res[keyName] = configValue;
        resourceConfig[item] = `{{${keyName}}}`;
      }
    } else {
      for (const itemName of Object.keys(resourceConfig)) {
        const configValue = resourceConfig[itemName];
        if (configValue !== undefined) {
          const keyName = `${resourceId}.${itemName}`;
          res[keyName] = configValue;
          resourceConfig[itemName] = `{{${keyName}}}`;
        }
      }
    }
  }
  return res;
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

// TODO: move other feature flags to featureFlags.ts to prevent import loop
export function isBicepEnvCheckerEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.BicepEnvCheckerEnable, true);
}

export function isExistingTabAppEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.ExistingTabApp, false);
}

export function isAadManifestEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.AadManifest, false);
}

export function isDeployManifestEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.DeployManifest, false);
}

export function isM365AppEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.M365App, false);
}

export function isApiConnectEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.ApiConnect, false);
}

export function isV3Enabled(): boolean {
  return process.env.TEAMSFX_V3 ? process.env.TEAMSFX_V3 === "true" : true;
}

export function isVideoFilterEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.VideoFilter, false);
}

// This method is for deciding whether AAD should be activated.
// Currently AAD plugin will always be activated when scaffold.
// This part will be updated when we support adding aad separately.
export function isAADEnabled(solutionSettings: AzureSolutionSettings | undefined): boolean {
  if (!solutionSettings) {
    return false;
  }

  if (isAadManifestEnabled()) {
    return (
      solutionSettings.hostType === HostTypeOptionAzure().id &&
      (solutionSettings.capabilities.includes(TabSsoItem().id) ||
        solutionSettings.capabilities.includes(BotSsoItem().id))
    );
  } else {
    return (
      solutionSettings.hostType === HostTypeOptionAzure().id &&
      // For scaffold, activeResourecPlugins is undefined
      (!solutionSettings.activeResourcePlugins ||
        solutionSettings.activeResourcePlugins?.includes(ResourcePlugins.Aad))
    );
  }
}

// TODO: handle VS scenario
export function canAddSso(
  projectSettings: ProjectSettings,
  returnError = false
): boolean | Result<Void, FxError> {
  // Can not add sso if feature flag is not enabled
  if (!isAadManifestEnabled()) {
    return returnError
      ? err(
          new SystemError(
            SolutionSource,
            SolutionError.NeedEnableFeatureFlag,
            getLocalizedString("core.addSso.needEnableFeatureFlag")
          )
        )
      : false;
  }

  const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
  if (
    isExistingTabApp(projectSettings) &&
    !(solutionSettings && solutionSettings.capabilities.includes(TabSsoItem().id))
  ) {
    return ok(Void);
  }
  if (!(solutionSettings.hostType === HostTypeOptionAzure().id)) {
    return returnError
      ? err(
          new SystemError(
            SolutionSource,
            SolutionError.AddSsoNotSupported,
            getLocalizedString("core.addSso.onlySupportAzure")
          )
        )
      : false;
  }

  // Will throw error if only Messaging Extension is selected
  if (
    solutionSettings.capabilities.length === 1 &&
    solutionSettings.capabilities[0] === MessageExtensionItem().id
  ) {
    return returnError
      ? err(
          new SystemError(
            SolutionSource,
            SolutionError.AddSsoNotSupported,
            getLocalizedString("core.addSso.onlyMeNotSupport")
          )
        )
      : false;
  }

  // Will throw error if bot host type is Azure Function
  if (
    solutionSettings.capabilities.includes(BotOptionItem().id) &&
    !(
      solutionSettings.capabilities.includes(TabOptionItem().id) &&
      !solutionSettings.capabilities.includes(TabSsoItem().id)
    )
  ) {
    const botHostType = projectSettings.pluginSettings?.[ResourcePlugins.Bot]?.[BotHostTypeName];
    if (botHostType === BotHostTypes.AzureFunctions) {
      return returnError
        ? err(
            new SystemError(
              SolutionSource,
              SolutionError.AddSsoNotSupported,
              getLocalizedString("core.addSso.functionNotSupport")
            )
          )
        : false;
    }
  }

  // Check whether SSO is enabled
  const activeResourcePlugins = solutionSettings.activeResourcePlugins;
  const containTabSsoItem = solutionSettings.capabilities.includes(TabSsoItem().id);
  const containTab = solutionSettings.capabilities.includes(TabOptionItem().id);
  const containBotSsoItem = solutionSettings.capabilities.includes(BotSsoItem().id);
  const containBot = solutionSettings.capabilities.includes(BotOptionItem().id);
  const containAadPlugin = activeResourcePlugins.includes(PluginNames.AAD);
  if (
    ((containTabSsoItem && !containBot) ||
      (containBot && containBotSsoItem && !containTab) ||
      (containTabSsoItem && containBot && containBotSsoItem)) &&
    containAadPlugin
  ) {
    return returnError
      ? err(
          new SystemError(
            SolutionSource,
            SolutionError.SsoEnabled,
            getLocalizedString("core.addSso.ssoEnabled")
          )
        )
      : false;
  } else if (
    ((containBotSsoItem && !containBot) ||
      (containTabSsoItem || containBotSsoItem) !== containAadPlugin) &&
    returnError
  ) {
    // Throw error if the project is invalid
    // Will not stop showing add sso
    const e = new UserError(
      SolutionSource,
      SolutionError.InvalidSsoProject,
      getLocalizedString("core.addSso.invalidSsoProject")
    );
    return err(e);
  }

  return returnError ? ok(Void) : true;
}

export function canAddApiConnection(solutionSettings?: AzureSolutionSettings): boolean {
  const activePlugins = solutionSettings?.activeResourcePlugins;
  if (!activePlugins) {
    return false;
  }
  return (
    activePlugins.includes(ResourcePlugins.Bot) || activePlugins.includes(ResourcePlugins.Function)
  );
}

// Conditions required to be met:
// 1. Not (All templates were existing env x provider x templates)
// 2. Not minimal app
export async function canAddCICDWorkflows(inputs: Inputs, ctx: v2.Context): Promise<boolean> {
  // Not include `Add CICD Workflows` in minimal app case.
  const isExistingApp =
    ctx.projectSetting.solutionSettings?.hostType === HostTypeOptionAzure().id &&
    isMiniApp(ctx.projectSetting as ProjectSettingsV3);
  if (isExistingApp) {
    return false;
  }

  if (!inputs.projectPath) {
    throw new NoProjectOpenedError();
  }

  const envProfilesResult = await environmentManager.listRemoteEnvConfigs(inputs.projectPath);
  if (envProfilesResult.isErr()) {
    throw new SystemError(
      "Core",
      "ListMultiEnvError",
      getDefaultString("error.cicd.FailedToListMultiEnv", envProfilesResult.error.message),
      getLocalizedString("error.cicd.FailedToListMultiEnv", envProfilesResult.error.message)
    );
  }

  const existingInstance = ExistingTemplatesStat.getInstance(
    inputs.projectPath,
    envProfilesResult.value
  );
  await existingInstance.scan();

  // If at least one env are not all-existing, return true.
  for (const envName of envProfilesResult.value) {
    if (existingInstance.notExisting(envName)) {
      return true;
    }
  }

  return false;
}

export async function getAppSPFxVersion(root: string): Promise<string | undefined> {
  let projectSPFxVersion = undefined;
  const yoInfoPath = path.join(root, "SPFx", ".yo-rc.json");
  if (await fs.pathExists(yoInfoPath)) {
    const yoInfo = await fs.readJson(yoInfoPath);
    projectSPFxVersion = yoInfo["@microsoft/generator-sharepoint"]?.version;
  }

  if (!projectSPFxVersion || projectSPFxVersion === "") {
    const packagePath = path.join(root, "SPFx", "package.json");
    if (await fs.pathExists(packagePath)) {
      const packageInfo = await fs.readJson(packagePath);
      projectSPFxVersion = packageInfo.dependencies["@microsoft/sp-webpart-base"];
    }
  }
  return projectSPFxVersion;
}

export async function generateBicepFromFile(
  templateFilePath: string,
  context: any
): Promise<string> {
  try {
    const templateString = await fs.readFile(templateFilePath, ConstantString.UTF8Encoding);
    const updatedBicepFile = compileHandlebarsTemplateString(templateString, context);
    return updatedBicepFile;
  } catch (error) {
    throw new SystemError(
      "Core",
      "BicepGenerationError",
      getDefaultString("error.BicepGenerationError", templateFilePath, error.message),
      getLocalizedString("error.BicepGenerationError", templateFilePath, error.message)
    );
  }
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

export function getStorageAccountNameFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(
    /providers\/Microsoft.Storage\/storageAccounts\/([^\/]*)/i,
    resourceId
  );
  if (!result) {
    throw FailedToParseResourceIdError("storage accounts name", resourceId);
  }
  return result;
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

export function IsSimpleAuthEnabled(projectSettings: ProjectSettings | undefined): boolean {
  const solutionSettings = projectSettings?.solutionSettings as AzureSolutionSettings;
  return solutionSettings?.activeResourcePlugins?.includes(ResourcePlugins.SimpleAuth);
}

interface BasicJsonSchema {
  type: string;
  properties?: {
    [k: string]: unknown;
  };
}
function isBasicJsonSchema(jsonSchema: unknown): jsonSchema is BasicJsonSchema {
  if (!jsonSchema || typeof jsonSchema !== "object") {
    return false;
  }
  return typeof (jsonSchema as { type: unknown })["type"] === "string";
}

function _redactObject(
  obj: unknown,
  jsonSchema: unknown,
  maxRecursionDepth = 8,
  depth = 0
): unknown {
  if (depth >= maxRecursionDepth) {
    // prevent stack overflow if anything bad happens
    return null;
  }
  if (!obj || !isBasicJsonSchema(jsonSchema)) {
    return null;
  }

  if (
    !(
      jsonSchema.type === "object" &&
      jsonSchema.properties &&
      typeof jsonSchema.properties === "object"
    )
  ) {
    // non-object types including unsupported types
    return null;
  }

  const newObj: { [key: string]: any } = {};
  const objAny = obj as any;
  for (const key in jsonSchema.properties) {
    if (key in objAny && objAny[key] !== undefined) {
      const filteredObj = _redactObject(
        objAny[key],
        jsonSchema.properties[key],
        maxRecursionDepth,
        depth + 1
      );
      newObj[key] = filteredObj;
    }
  }
  return newObj;
}

/** Redact user content in "obj";
 *
 * DFS "obj" and "jsonSchema" together to redact the following things:
 * - properties that is not defined in jsonSchema
 * - the value of properties that is defined in jsonSchema, but the keys will remain
 *
 * Example:
 * Input:
 * ```
 *  obj = {
 *    "name": "some name",
 *    "user defined property": {
 *      "key1": "value1"
 *    }
 *  }
 *  jsonSchema = {
 *    "type": "object",
 *    "properties": {
 *      "name": { "type": "string" }
 *    }
 *  }
 * ```
 * Output:
 * ```
 *  {"name": null}
 * ```
 **/
export function redactObject(obj: unknown, jsonSchema: unknown, maxRecursionDepth = 8): unknown {
  return _redactObject(obj, jsonSchema, maxRecursionDepth, 0);
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

export function createV2Context(projectSettings: ProjectSettings): v2.Context {
  const context: v2.Context = {
    userInteraction: TOOLS.ui,
    logProvider: TOOLS.logProvider,
    telemetryReporter: TOOLS.telemetryReporter!,
    cryptoProvider: new LocalCrypto(projectSettings.projectId),
    permissionRequestProvider: TOOLS.permissionRequest,
    projectSetting: projectSettings,
  };
  return context;
}

export function undefinedName(objs: any[], names: string[]) {
  for (let i = 0; i < objs.length; ++i) {
    if (objs[i] === undefined) {
      return names[i];
    }
  }
  return undefined;
}

export function getPropertyByPath(obj: any, path: string, defaultValue?: string) {
  return _.get(obj, path, defaultValue);
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
    if (isV3Enabled()) {
      const settingsPath = getProjectSettingPathV3(rootPath);

      if (!settingsPath || !fs.pathExistsSync(settingsPath)) {
        return undefined;
      }

      const settingsContent = fs.readFileSync(settingsPath, "utf-8");
      const settings = parse(settingsContent);
      return {
        projectId: settings?.projectId ?? undefined,
      };
    } else {
      const projectSettingsPath = path.join(
        rootPath,
        `.${ConfigFolderName}`,
        InputConfigsFolderName,
        ProjectSettingsFileName
      );

      if (!projectSettingsPath || !fs.pathExistsSync(projectSettingsPath)) {
        return undefined;
      }

      const projectSettings = fs.readJsonSync(projectSettingsPath);
      return {
        projectId: projectSettings?.projectId ?? undefined,
        isFromSample: projectSettings?.isFromSample ?? undefined,
        programmingLanguage: projectSettings?.programmingLanguage ?? undefined,
        hostType: projectSettings?.solutionSettings?.hostType ?? undefined,
        isM365: projectSettings?.isM365 ?? false,
      };
    }
  } catch {
    return undefined;
  }
}
