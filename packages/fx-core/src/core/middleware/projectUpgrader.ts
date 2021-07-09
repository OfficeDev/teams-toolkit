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
    const userDataPath = path.resolve(confFolderPath, `${envName}.userdata`);
    const contextPath = path.resolve(confFolderPath, `env.${envName}.json`);
    const [userData, context] = await getUserDataAndContext(userDataPath, contextPath);

    for (const item of contextUpgrade) {
      // Secret not in userdata file, means has not run local debug before.
      // Will delete related keys if exists.
      if (item.secret && !userData[getUserDataKey(item.plugin, item.secret)]) {
        deleteKeysFromContext(context, item.plugin, item.relatedKeys);
      }

      // Secret in userdata file.
      // Move keys from context to userdata, and will add key in context.
      const keyMoved = moveKeysFromContextToUserData(
        userData,
        context,
        item.plugin,
        item.relatedKeys
      );

      // Check whether secret is complete
      let keyCompleted = true;
      for (const relatedKey of item.relatedKeys) {
        const userDataKey = getUserDataKey(item.plugin, relatedKey);
        if (!userData[userDataKey] || isSecretPattern(userData[userDataKey])) {
          keyCompleted = false;
          break;
        }
      }

      // If key is complete, which means all configs are set.
      if (keyCompleted) {
        // If some key is moved in moveKeysFromContextToUserData, will send log to inform user context is upgraded.
        if (keyMoved) {
          const core = ctx.self as FxCore;
          const logger =
            core !== undefined && core.tools !== undefined && core.tools.logProvider !== undefined
              ? core.tools.logProvider
              : undefined;
          if (logger) {
            logger.info(
              `[core]: context version of ${item.plugin} is too low. Will update context and move some config from env to userdata.`
            );
          }
        }
      } else {
        // Key missing.
        // Will delete context and key
        deleteKeysFromContext(context, item.plugin, item.relatedKeys);
        deleteSecretFromUserData(userData, item.plugin, item.secret);
      }
    }
    await saveUserDataAndContext(userDataPath, userData, contextPath, context);
  } catch (error) {
    ctx.result = err(ContextUpgradeError(error));
  }
}

async function getUserDataAndContext(
  userDataPath: string,
  contextPath: string
): Promise<[Record<string, string>, Json]> {
  let dict: Record<string, string>;
  if (await fs.pathExists(userDataPath)) {
    const dictContent = await fs.readFile(userDataPath, "UTF-8");
    dict = deserializeDict(dictContent);
  } else {
    dict = {};
  }

  const configJson: Json = await fs.readJson(contextPath);
  return [dict, configJson];
}

async function saveUserDataAndContext(
  userDataPath: string,
  userData: Record<string, string>,
  contextPath: string,
  context: Json
): Promise<void> {
  await fs.writeFile(contextPath, JSON.stringify(context, null, 4));
  await fs.writeFile(userDataPath, serializeDict(userData));
}

function deleteKeysFromContext(context: Json, plugin: string, keys: string[]): Json {
  const pluginContext: any = context[plugin];
  if (!pluginContext) {
    return context;
  }

  for (const key of keys) {
    if (pluginContext[key]) {
      delete pluginContext[key];
    }
  }

  return context;
}

function deleteSecretFromUserData(
  userData: Record<string, string>,
  plugin: string,
  secret?: string
): Record<string, string> {
  if (secret && userData[getUserDataKey(plugin, secret)]) {
    delete userData[getUserDataKey(plugin, secret)];
  }

  return userData;
}

function moveKeysFromContextToUserData(
  userData: Record<string, string>,
  context: Json,
  plugin: string,
  keys: string[]
): boolean {
  let keyMoved = false;
  const pluginContext: any = context[plugin];
  if (!pluginContext) {
    return false;
  }

  for (const key of keys) {
    const value = pluginContext[key];
    if (value && !isSecretPattern(value)) {
      keyMoved = true;
      userData[getUserDataKey(plugin, key)] = value;
      pluginContext[key] = getSecretPattern(plugin, key);
    }
  }

  return keyMoved;
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
