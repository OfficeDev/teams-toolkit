// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { exec } from "child_process";
import * as fs from "fs-extra";
import {
  AzureAccountProvider,
  AzureSolutionSettings,
  ConfigFolderName,
  ConfigMap,
  err,
  FxError,
  Json,
  ok,
  OptionItem,
  ProjectSettings,
  Result,
  returnSystemError,
  returnUserError,
  SolutionContext,
  SubscriptionInfo,
  UserInteraction,
} from "@microsoft/teamsfx-api";
import { promisify } from "util";
import axios from "axios";
import AdmZip from "adm-zip";
import * as path from "path";
import * as uuid from "uuid";
import { glob } from "glob";
import { getResourceFolder } from "..";
import { PluginNames } from "../plugins/solution/fx-solution/constants";
import {
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceSQL,
  AzureSolutionQuestionNames,
  BotOptionItem,
  HostTypeOptionSPFx,
  MessageExtensionItem,
  TabOptionItem,
} from "../plugins/solution/fx-solution/question";
import * as Handlebars from "handlebars";

Handlebars.registerHelper("contains", (value, array, options) => {
  array = array instanceof Array ? array : [array];
  return array.indexOf(value) > -1 ? options.fn(this) : "";
});

const execAsync = promisify(exec);

export async function npmInstall(path: string) {
  await execAsync("npm install", {
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
export function mapToJson(map: Map<any, any>): Json {
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
  "solution.localDebugTeamsAppId",
  "solution.teamsAppTenantId",
  "fx-resource-aad-app-for-teams.clientSecret",
  "fx-resource-aad-app-for-teams.local_clientSecret",
  "fx-resource-aad-app-for-teams.local_clientId",
  "fx-resource-aad-app-for-teams.local_objectId",
  "fx-resource-aad-app-for-teams.local_oauth2PermissionScopeId",
  "fx-resource-aad-app-for-teams.local_tenantId",
  "fx-resource-aad-app-for-teams.local_applicationIdUris",
  "fx-resource-simple-auth.filePath",
  "fx-resource-simple-auth.environmentVariableParams",
  "fx-resource-local-debug.*",
  "fx-resource-bot.botPassword",
  "fx-resource-bot.localBotPassword",
  "fx-resource-bot.localBotId",
  "fx-resource-bot.localObjectId",
  "fx-resource-bot.local_redirectUri",
  "fx-resource-bot.bots",
  "fx-resource-bot.composeExtensions",
  "fx-resource-apim.apimClientAADClientSecret",
];

const CryptoDataMatchers = new Set([
  "fx-resource-aad-app-for-teams.clientSecret",
  "fx-resource-aad-app-for-teams.local_clientSecret",
  "fx-resource-simple-auth.environmentVariableParams",
  "fx-resource-bot.botPassword",
  "fx-resource-bot.localBotPassword",
  "fx-resource-apim.apimClientAADClientSecret",
]);

/**
 * Only data related to secrets need encryption.
 * @param key - the key name of data in user data file
 * @returns whether it needs encryption
 */
export function dataNeedEncryption(key: string): boolean {
  return CryptoDataMatchers.has(key);
}

export function sperateSecretData(configJson: Json): Record<string, string> {
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

export function mergeSerectData(dict: Record<string, string>, configJson: Json): void {
  for (const matcher of SecretDataMatchers) {
    const splits = matcher.split(".");
    const resourceId = splits[0];
    const item = splits[1];
    const resourceConfig: any = configJson[resourceId];
    if (!resourceConfig) continue;
    if ("*" !== item) {
      const originalItemValue: string | undefined = resourceConfig[item] as string | undefined;
      if (
        originalItemValue &&
        originalItemValue.startsWith("{{") &&
        originalItemValue.endsWith("}}")
      ) {
        const keyName = `${resourceId}.${item}`;
        resourceConfig[item] = dict[keyName];
      }
    } else {
      for (const itemName of Object.keys(resourceConfig)) {
        const originalItemValue = resourceConfig[itemName];
        if (
          originalItemValue &&
          originalItemValue.startsWith("{{") &&
          originalItemValue.endsWith("}}")
        ) {
          const keyName = `${resourceId}.${itemName}`;
          resourceConfig[itemName] = dict[keyName];
        }
      }
    }
  }
}

export function serializeDict(dict: Record<string, string>): string {
  const array: string[] = [];
  for (const key of Object.keys(dict)) {
    const value = dict[key];
    array.push(`${key}=${value}`);
  }
  return array.join("\n");
}

export function deserializeDict(data: string): Record<string, string> {
  const lines = data.split("\n");
  const dict: Record<string, string> = {};
  for (const line of lines) {
    const index = line.indexOf("=");
    if (index > 0) {
      const key = line.substr(0, index);
      const value = line.substr(index + 1);
      dict[key] = value;
    }
  }
  return dict;
}

export async function fetchCodeZip(url: string) {
  let retries = 3;
  let result = undefined;
  while (retries > 0) {
    retries--;
    try {
      result = await axios.get(url, {
        responseType: "arraybuffer",
      });
      if (result.status === 200 || result.status === 201) {
        return result;
      }
    } catch (e) {
      await new Promise<void>((resolve: () => void): NodeJS.Timer => setTimeout(resolve, 10000));
    }
  }
  return result;
}

export async function saveFilesRecursively(
  zip: AdmZip,
  appFolder: string,
  dstPath: string
): Promise<void> {
  await Promise.all(
    zip
      .getEntries()
      .filter((entry) => !entry.isDirectory && entry.entryName.includes(appFolder))
      .map(async (entry) => {
        const entryPath = entry.entryName.substring(entry.entryName.indexOf("/") + 1);
        const filePath = path.join(dstPath, entryPath);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, entry.getData());
      })
  );
}

export async function downloadSampleHook(sampleId: string, sampleAppPath: string) {
  // A temporary solution to avoid duplicate componentId
  if (sampleId === "todo-list-SPFx") {
    const originalId = "c314487b-f51c-474d-823e-a2c3ec82b1ff";
    const componentId = uuid.v4();
    glob.glob(`${sampleAppPath}/**/*.json`, { nodir: true, dot: true }, async (err, files) => {
      await Promise.all(
        files.map(async (file) => {
          let content = (await fs.readFile(file)).toString();
          const reg = new RegExp(originalId, "g");
          content = content.replace(reg, componentId);
          await fs.writeFile(file, content);
        })
      );
    });
  }
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

export function getStrings(): any {
  const filepath = path.resolve(getResourceFolder(), "strings.json");
  return fs.readJSONSync(filepath);
}

export function isUserCancelError(error: Error): boolean {
  const errorName = "name" in error ? (error as any)["name"] : "";
  return (
    errorName === "User Cancel" ||
    errorName === getStrings().solution.CancelProvision ||
    errorName === "UserCancel"
  );
}

export function isValidProject(workspacePath?: string): boolean {
  if (!workspacePath) return false;
  try {
    const confFolderPath = path.resolve(workspacePath, `.${ConfigFolderName}`);
    const settingsFile = path.resolve(confFolderPath, "settings.json");
    const manifestFile = path.resolve(confFolderPath, "manifest.source.json");
    const projectSettings: ProjectSettings = fs.readJsonSync(settingsFile);
    const manifest = fs.readJSONSync(manifestFile);
    if (!manifest) return false;
    if (!projectSettings.currentEnv) projectSettings.currentEnv = "default";
    if (validateSettings(projectSettings)) return false;
    // const envName = projectSettings.currentEnv;
    // const jsonFilePath = path.resolve(confFolderPath, `env.${envName}.json`);
    // const configJson: Json = fs.readJsonSync(jsonFilePath);
    // if(validateConfig(projectSettings.solutionSettings as AzureSolutionSettings, configJson))
    //   return false;
    return true;
  } catch (e) {
    return false;
  }
}

export function validateProject(solutionContext: SolutionContext): string | undefined {
  const res = validateSettings(solutionContext.projectSettings);
  return res;
  // const configJson = mapToJson(solutionContext.config);
  // res = validateConfig(solutionContext.projectSettings!.solutionSettings as AzureSolutionSettings, configJson);
  // if(res) return res;
  // return undefined;
}

export function validateSettings(projectSettings?: ProjectSettings): string | undefined {
  if (!projectSettings) return "empty projectSettings";
  if (!projectSettings.solutionSettings) return "empty solutionSettings";
  const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
  if (solutionSettings.hostType === undefined) return "empty solutionSettings.hostType";
  if (
    solutionSettings.activeResourcePlugins === undefined ||
    solutionSettings.activeResourcePlugins.length === 0
  )
    return "empty solutionSettings.activeResourcePlugins";
  const capabilities = solutionSettings.capabilities || [];
  const azureResources = solutionSettings.azureResources || [];
  const plugins = solutionSettings.activeResourcePlugins || [];
  // if(!configJson[PluginNames.LDEBUG]) return "local debug config is missing";
  if (!plugins.includes(PluginNames.LDEBUG))
    return `${PluginNames.LDEBUG} setting is missing in settings.json`;
  if (solutionSettings.hostType === HostTypeOptionSPFx.id) {
    // if(!configJson[PluginNames.SPFX]) return "SPFx config is missing";
    if (!plugins.includes(PluginNames.SPFX))
      return "SPFx setting is missing in activeResourcePlugins";
  } else {
    if (capabilities.includes(TabOptionItem.id)) {
      // if(!configJson[PluginNames.FE]) return "Frontend hosting config is missing";
      if (!plugins.includes(PluginNames.FE))
        return `${PluginNames.FE} setting is missing in settings.json`;

      // if(!configJson[PluginNames.AAD]) return "AAD config is missing";
      if (!plugins.includes(PluginNames.AAD))
        return `${PluginNames.AAD} setting is missing in settings.json`;

      // if(!configJson[PluginNames.SA]) return "Simple auth config is missing";
      if (!plugins.includes(PluginNames.SA))
        return `${PluginNames.SA} setting is missing in settings.json`;
    }
    if (capabilities.includes(BotOptionItem.id)) {
      // if(!configJson[PluginNames.BOT]) return "Bot config is missing";
      if (!plugins.includes(PluginNames.BOT))
        return `${PluginNames.BOT} setting is missing in settings.json`;
    }
    if (capabilities.includes(MessageExtensionItem.id)) {
      // if(!configJson[PluginNames.BOT]) return "MessagingExtension config is missing";
      if (!plugins.includes(PluginNames.BOT))
        return `${PluginNames.BOT} setting is missing in settings.json`;
    }
    if (azureResources.includes(AzureResourceSQL.id)) {
      // if(!configJson[PluginNames.SQL]) return "Azure SQL config is missing";
      if (!plugins.includes(PluginNames.SQL))
        return `${PluginNames.SQL} setting is missing in settings.json`;
      // if(!configJson[PluginNames.MSID]) return "SQL identity config is missing";
      if (!plugins.includes(PluginNames.MSID))
        return `${PluginNames.MSID} setting is missing in settings.json`;
    }
    if (azureResources.includes(AzureResourceFunction.id)) {
      // if(!configJson[PluginNames.FUNC]) return "Azure functions config is missing";
      if (!plugins.includes(PluginNames.FUNC))
        return `${PluginNames.FUNC} setting is missing in settings.json`;
    }
    if (azureResources.includes(AzureResourceApim.id)) {
      // if(!configJson[PluginNames.APIM]) return "API Management config is missing";
      if (!plugins.includes(PluginNames.APIM))
        return `${PluginNames.APIM} setting is missing in settings.json`;
    }
  }
  return undefined;
}

export async function askSubscription(
  azureAccountProvider: AzureAccountProvider,
  ui: UserInteraction,
  activeSubscriptionId?: string
): Promise<Result<SubscriptionInfo, FxError>> {
  const subscriptions: SubscriptionInfo[] = await azureAccountProvider.listSubscriptions();

  if (subscriptions.length === 0) {
    return err(
      returnUserError(new Error("Failed to find a subscription."), "Core", "NoSubscriptionFound")
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
        name: AzureSolutionQuestionNames.AskSub,
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
        returnSystemError(new Error("Subscription not found"), "Core", "NoSubscriptionFound")
      );
    }
    resultSub = selectedSub;
  }
  return ok(resultSub);
}

// Determine whether feature flag is enabled based on environment variable setting
export function isFeatureFlagEnabled(featureFlagName: string, defaultValue = false): boolean {
  const flag = process.env[featureFlagName];
  if (flag === undefined) {
    return defaultValue; // allows consumer to set a default value when environment variable not set
  } else {
    return flag === "1" || flag.toLowerCase() === "true"; // can enable feature flag by set environment variable value to "1" or "true"
  }
}

export function isArmSupportEnabled(): boolean {
  return isFeatureFlagEnabled("TEAMSFX_ARM_SUPPORT", false);
}

export async function generateBicepFiles(
  templateFilePath: string,
  context: any
): Promise<Result<string, FxError>> {
  try {
    const templateString = await fs.readFile(templateFilePath, "utf8");
    const updatedBicepFile = compileHandlebarsTemplateString(templateString, context);
    return ok(updatedBicepFile);
  } catch (error) {
    return err(
      returnSystemError(
        new Error(`Failed to generate bicep file ${templateFilePath}. Reason: ${error.message}`),
        "Core",
        "BicepGenerationError"
      )
    );
  }
}

export function compileHandlebarsTemplateString(templateString: string, context: any): string {
  const template = Handlebars.compile(templateString);
  return template(context);
}
