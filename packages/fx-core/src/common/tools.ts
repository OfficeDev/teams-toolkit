// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { exec } from "child_process";
import * as fs from "fs-extra";
import { AzureAccountProvider, AzureSolutionSettings, ConfigFolderName, ConfigMap, Dict, err, FxError, Json, ok, OptionItem, ProjectSettings, Result, returnSystemError, returnUserError, SubscriptionInfo, Tools, UserError, UserInteraction } from "@microsoft/teamsfx-api";
import { promisify } from "util";
import axios from "axios";
import AdmZip from "adm-zip";
import * as path from "path";
import { getResourceFolder } from "..";
import { fakeServer } from "sinon";
import { PluginNames } from "../plugins";
import { AzureResourceApim, AzureResourceFunction, AzureResourceSQL, BotOptionItem, HostTypeOptionSPFx, MessageExtensionItem, TabOptionItem } from "../plugins/solution/fx-solution/question";

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
  "fx-resource-aad-app-for-teams.clientSecret",
  "fx-resource-aad-app-for-teams.local_clientSecret",
  "fx-resource-simple-auth.filePath",
  "fx-resource-simple-auth.environmentVariableParams",
  "fx-resource-local-debug.*",
  "fx-resource-bot.botPassword",
  "fx-resource-bot.localBotPassword",
  "fx-resource-apim.apimClientAADClientSecret",
];

export function sperateSecretData(configJson: Json): Record<string,string> {
  const res: Record<string,string> = {};
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

export function mergeSerectData(dict: Record<string,string>, configJson: Json): void {
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

export function serializeDict(dict: Record<string,string>): string {
  const array: string[] = [];
  for (const key of Object.keys(dict)) {
    const value = dict[key];
    array.push(`${key}=${value}`);
  }
  return array.join("\n");
}

export function deserializeDict(data: string): Record<string,string> {
  const lines = data.split("\n");
  const dict: Record<string,string> = {};
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
  try{
    const confFolderPath = path.resolve(workspacePath, `.${ConfigFolderName}`);
    const settingsFile = path.resolve(confFolderPath, "settings.json");
    const manifestFile = path.resolve(confFolderPath, "manifest.source.json");
    const projectSettings: ProjectSettings = fs.readJsonSync(settingsFile);
    const manifest = fs.readJSONSync(manifestFile);
    if(!manifest) return false;
    if(!projectSettings.currentEnv)
      projectSettings.currentEnv = "default";
    if(!validateSettings(projectSettings))
        return false;
    const envName = projectSettings.currentEnv;
    const jsonFilePath = path.resolve(confFolderPath, `env.${envName}.json`);
    const configJson: Json = fs.readJsonSync(jsonFilePath);
    if(!validateConfig(projectSettings.solutionSettings as AzureSolutionSettings, configJson))
      return false;
    return true;
  }
  catch(e){
    return false;
  }
}

export function validateSettings(projectSettings: ProjectSettings):boolean{
  if(!projectSettings.solutionSettings) return false;
  const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
  if(solutionSettings.hostType === undefined) return false;
  if(solutionSettings.activeResourcePlugins === undefined || solutionSettings.activeResourcePlugins.length === 0)
    return false;
  return true;
}

export function validateConfig(solutioSettings:AzureSolutionSettings, configJson: Json): boolean {
  if(!configJson[PluginNames.SOLUTION]) return false;
  const capabilities = solutioSettings.capabilities;
  const azureResources = solutioSettings.azureResources;
  const plugins = solutioSettings.activeResourcePlugins;
  if(!configJson[PluginNames.LDEBUG]) return false;
  if(!plugins.includes(PluginNames.LDEBUG)) return false;
  if(solutioSettings.hostType === HostTypeOptionSPFx.id){
    if(!configJson[PluginNames.SPFX]) return false;
    if(!plugins.includes(PluginNames.SPFX)) return false;
  }
  else {
    if(capabilities.includes(TabOptionItem.id)){
      if(!configJson[PluginNames.FE]) return false;
      if(!plugins.includes(PluginNames.FE)) return false;

      if(!configJson[PluginNames.AAD]) return false;
      if(!plugins.includes(PluginNames.AAD)) return false;

      if(!configJson[PluginNames.SA]) return false;
      if(!plugins.includes(PluginNames.SA)) return false;
    }
    if(capabilities.includes(BotOptionItem.id)){
      if(!configJson[PluginNames.BOT]) return false;
      if(!plugins.includes(PluginNames.BOT)) return false;
    }
    if(capabilities.includes(MessageExtensionItem.id)){
      if(!configJson[PluginNames.BOT]) return false;
      if(!plugins.includes(PluginNames.BOT)) return false;
    }
    if(azureResources.includes(AzureResourceSQL.id)){
      if(!configJson[PluginNames.SQL]) return false;
      if(!plugins.includes(PluginNames.SQL)) return false;
      if(!configJson[PluginNames.MSID]) return false;
      if(!plugins.includes(PluginNames.MSID)) return false;
    }
    if(azureResources.includes(AzureResourceFunction.id)){
      if(!configJson[PluginNames.FUNC]) return false;
      if(!plugins.includes(PluginNames.FUNC)) return false;
    }
    if(azureResources.includes(AzureResourceApim.id)){
      if(!configJson[PluginNames.APIM]) return false;
      if(!plugins.includes(PluginNames.APIM)) return false;
    }
  }
  return true;
}

export async function askSubscription(azureAccountProvider:AzureAccountProvider, ui:UserInteraction , activeSubscriptionId?:string): Promise<Result<SubscriptionInfo, FxError>>{
  const subscriptions: SubscriptionInfo[] = await azureAccountProvider.listSubscriptions();
  if (subscriptions.length === 0) {
    return err(
      returnUserError(
        new Error("Failed to find a subscription."),
        "Core",
        "NoSubscriptionFound"
      )
    );
  }
  let resultSub = subscriptions.find((sub) => sub.subscriptionId === activeSubscriptionId);
  if ( activeSubscriptionId === undefined || resultSub === undefined ) {
    let selectedSub:SubscriptionInfo|undefined = undefined;
    if(subscriptions.length === 1){
      selectedSub = subscriptions[0];
    }
    else {
      const options: OptionItem[] = subscriptions.map(
        (sub) => {
          return { 
            id: sub.subscriptionId, 
            label: sub.subscriptionName,
            data: sub.tenantId
          } as OptionItem
        }
      ); 
      const askRes = await ui.selectOption({
        name: "asksub",
        title: "Select a subscription",
        options: options,
        returnObject: true
      }); 
      if(askRes.isErr()) 
        return err(askRes.error);
      const subItem = askRes.value.result as OptionItem;
      selectedSub = {
        subscriptionId: subItem.id,
        subscriptionName: subItem.label,
        tenantId: subItem.data as string
      };
    }
    if (selectedSub === undefined) {
      return err(
        returnSystemError(
          new Error("Subscription not found"),
          "Core",
          "NoSubscriptionFound"
        )
      );
    }
    resultSub = selectedSub;
  }  
  return ok(resultSub);
}