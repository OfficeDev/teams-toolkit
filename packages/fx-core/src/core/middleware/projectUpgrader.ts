import { Middleware, NextFunction } from "@feathersjs/hooks";
import { ConfigFolderName, err, Inputs, Json, ProjectSettings } from "@microsoft/teamsfx-api";
import {
  ContextUpgradeError,
  CoreHookContext,
  FxCore,
  NoProjectOpenedError,
  PathNotExistError,
} from "..";
import * as fs from "fs-extra";
import * as path from "path";
import { deserializeDict, serializeDict } from "../..";

const contextUpgrade = [
  {
    plugin: "solution",
    relatedKeys: ["localDebugTeamsAppId", "teamsAppTenantId"],
  },
  {
    plugin: "fx-resource-aad-app-for-teams",
    secret: "local_clientSecret",
    relatedKeys: [
      "local_clientId",
      "local_objectId",
      "local_oauth2PermissionScopeId",
      "local_tenantId",
      "local_applicationIdUris",
    ],
  },
  {
    plugin: "fx-resource-bot",
    secret: "localBotPassword",
    relatedKeys: ["localBotId", "localObjectId", "local_redirectUri", "bots", "composeExtensions"],
  },
];

export const ProjectUpgraderMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  await upgradeContext(ctx);
  await next();
};

export async function upgradeContext(ctx: CoreHookContext): Promise<void> {
  try {
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    if (!inputs.projectPath) {
      ctx.result = err(NoProjectOpenedError());
      return;
    }
    const projectPathExist = await fs.pathExists(inputs.projectPath);
    if (!projectPathExist) {
      ctx.result = err(PathNotExistError(inputs.projectPath));
      return;
    }
    const confFolderPath = path.resolve(inputs.projectPath!, `.${ConfigFolderName}`);
    const settingsFile = path.resolve(confFolderPath, "settings.json");
    const projectSettings: ProjectSettings = await fs.readJson(settingsFile);
    const envName = projectSettings.currentEnv;

    // Read context file.
    const contextPath = path.resolve(confFolderPath, `env.${envName}.json`);
    const context = await readContext(contextPath);

    // Update value of specific key in context file to secret pattern.
    // Return: map of updated values.
    const updatedKeys = updateContextValue(context);
    if (!updatedKeys || updatedKeys.keys.length == 0) {
      // No keys need to be updated, which means the file is up-to-date.
      // Can quit directly.
      return;
    }

    // Some keys updated.
    // Save the updated context and send log.
    await saveContext(contextPath, context);
    const core = ctx.self as FxCore;
    const logger =
      core !== undefined && core.tools !== undefined && core.tools.logProvider !== undefined
        ? core.tools.logProvider
        : undefined;
    if (logger) {
      logger.info(
        "[core]: context version is too low. Will update context and move some config from env to userdata."
      );
    }

    // Read UserData file.
    const userDataPath = path.resolve(confFolderPath, `${envName}.userdata`);
    const userData = await readUserData(userDataPath);

    // Merge updatedKeys into UserData.
    mergeKeysToUserDate(userData, updatedKeys);

    // Save UserData
    await saveUserData(userDataPath, userData);
  } catch (error) {
    ctx.result = err(ContextUpgradeError(error));
  }
}

async function readUserData(userDataPath: string): Promise<Record<string, string>> {
  let dict: Record<string, string>;
  if (await fs.pathExists(userDataPath)) {
    const dictContent = await fs.readFile(userDataPath, "UTF-8");
    dict = deserializeDict(dictContent);
  } else {
    dict = {};
  }

  return dict;
}

async function saveUserData(userDataPath: string, userData: Record<string, string>): Promise<void> {
  await fs.writeFile(userDataPath, serializeDict(userData));
}

async function readContext(contextPath: string): Promise<Json> {
  const configJson: Json = await fs.readJson(contextPath);
  return configJson;
}

async function saveContext(contextPath: string, context: Json): Promise<void> {
  await fs.writeFile(contextPath, JSON.stringify(context, null, 4));
}

function updateContextValue(context: Json): Map<string, any> {
  const res: Map<string, any> = new Map();
  for (const item of contextUpgrade) {
    const pluginContext: any = context[item.plugin];
    if (!pluginContext) {
      continue;
    }

    for (const key of item.relatedKeys) {
      // Save value to res and update value to secret pattern if value is not in secret pattern.
      if (pluginContext[key] && !isSecretPattern(pluginContext[key])) {
        res.set(getUserDataKey(item.plugin, key), pluginContext[key]);
        pluginContext[key] = getSecretPattern(item.plugin, key);
      }
    }
  }

  return res;
}

function mergeKeysToUserDate(
  userData: Record<string, string>,
  updatedKeys: Map<string, any>
): void {
  for (const item of contextUpgrade) {
    // Check whether corresponding secret exists.
    // For keys in solution, no secret check is needed.
    if (item.secret && !userData[getUserDataKey(item.plugin, item.secret)]) {
      continue;
    }

    for (const key of item.relatedKeys) {
      const userDataKey = getUserDataKey(item.plugin, key);
      // Merge will only happen when userData does not contain certain key.
      // Otherwise, value in userData will be regarded as source of truth.
      if (!userData[userDataKey] && updatedKeys.has(userDataKey)) {
        userData[userDataKey] = updatedKeys.get(userDataKey);
      }
    }
  }
}

function getUserDataKey(plugin: string, key: string) {
  return `${plugin}.${key}`;
}

function isSecretPattern(value: string) {
  return value.startsWith("{{") && value.endsWith("}}");
}

function getSecretPattern(plugin: string, key: string) {
  return `{{${getUserDataKey(plugin, key)}}}`;
}
