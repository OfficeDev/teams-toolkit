// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";

import { AppPackageFolderName } from "@microsoft/teamsfx-api";

import { copilotStudioClient } from "../../client/copilotStudioClient";
import { CopilotStudioScopes } from "../../common/constants";
import { MetadataV3 } from "../../common/versionMetadata";
import { copilotGptManifestUtils } from "../driver/teamsApp/utils/CopilotGptManifestUtils";
import { manifestUtils } from "../driver/teamsApp/utils/ManifestUtils";
import { envUtil } from "../utils/envUtil";
import { DeclarativeAgentBotContext } from "./declarativeAgentBotContext";
import { DeclarativeAgentBotDefinition } from "./declarativeAgentDefinition";
import { loadStateFromEnv } from "../driver/util/utils";

const launchJsonFile = ".vscode/launch.json";
const defaultOutputNames = {
  m365AppId: "M365_APP_ID",
};

export async function create(context: DeclarativeAgentBotContext): Promise<void> {
  await wrapExecution(context);
}

async function wrapExecution(context: DeclarativeAgentBotContext): Promise<void> {
  try {
    await process(context);
  } catch (error: any) {
    await rollbackExecution(context);
    throw error;
  }
}

async function process(context: DeclarativeAgentBotContext): Promise<void> {
  await updateLaunchJson(context);
  await uppdateManifest(context);
  await provisionBot(context);
  await getBotId(context);
  await updateEnv(context);
}

async function updateLaunchJson(context: DeclarativeAgentBotContext): Promise<void> {
  const launchJsonPath = path.join(context.projectPath, launchJsonFile);
  if (await fs.pathExists(launchJsonPath)) {
    await context.backup(launchJsonPath);
    let launchJsonContent = await fs.readFile(launchJsonPath, "utf8");

    const jsonObject = JSON.parse(launchJsonContent);
    jsonObject.configurations.push({
      name: "Preview Bot in Teams (Edge)",
      type: "msedge",
      request: "launch",
      url:
        "https://teams.microsoft.com/l/app/" +
        "${{TEAMS_APP_ID}}?installAppPackage" +
        "=true&webjoin=true&${account-hint}",
      cascadeTerminateToConfigurations: ["Attach to Local Service"],
      presentation: {
        group: "2-bot",
        order: 1,
      },
      internalConsoleOptions: "neverOpen",
    });
    jsonObject.configurations.push({
      name: "Preview Bot in Teams (Chrome)",
      type: "chrome",
      request: "launch",
      url:
        "https://teams.microsoft.com/l/app/" +
        "${{TEAMS_APP_ID}}?installAppPackage" +
        "=true&webjoin=true&${account-hint}",
      presentation: {
        group: "2-bot",
        order: 2,
      },
    });
    launchJsonContent = JSON.stringify(jsonObject, null, 4);
    await context.fsWriteFile(launchJsonPath, launchJsonContent, "utf8");
  }
}

async function uppdateManifest(context: DeclarativeAgentBotContext): Promise<void> {
  const manifestPath = path.join(AppPackageFolderName, MetadataV3.teamsManifestFileName);
  if (await fs.pathExists(manifestPath)) {
    await context.backup(manifestPath);
    const manifestContent = await manifestUtils.readAppManifest(context.projectPath);
    if (manifestContent.isErr()) {
      return;
    }
    const manifest = manifestContent.value;
    if (!manifest.bots) {
      manifest.bots = [];
    }
    manifest.bots.push({
      botId: "${{BOT_ID}}",
      scopes: ["personal", "team", "groupChat"],
      supportsFiles: false,
      isNotificationOnly: false,
    });
    await context.fsWriteFile(manifestPath, manifest);
  }
}

async function provisionBot(context: DeclarativeAgentBotContext): Promise<void> {
  const agentManifestPath = path.join(context.projectPath, context.declarativeAgentManifestPath);
  const agentManifest = await copilotGptManifestUtils.readCopilotGptManifestFile(agentManifestPath);
  if (agentManifest.isErr()) {
    return;
  }

  const state = loadStateFromEnv(new Map(Object.entries(defaultOutputNames)));
  if (!state.m365AppId) {
    throw new Error("M365 app id is not found in .env file");
  }

  // construct payload for bot provisioning
  const payload: DeclarativeAgentBotDefinition = {
    GptDefinition: {
      id: agentManifest.value.id,
      name: agentManifest.value.name,
      teams_app_id: state.m365AppId,
    },
    PersistentModel: 0,
    EnableChannels: ["msteams"],
    IsMultiTenant: context.multiTenant,
  };

  // provision bot
  const result = await context.tokenProvider!.getAccessToken({
    scopes: CopilotStudioScopes,
  });

  if (result.isErr()) {
    throw result.error;
  }

  await copilotStudioClient.createBot(result.value, payload);
}

async function getBotId(context: DeclarativeAgentBotContext): Promise<void> {
  const result = await context.tokenProvider!.getAccessToken({
    scopes: CopilotStudioScopes,
  });

  if (result.isErr()) {
    return;
  }

  const accessToken = result.value;
  if (context.declarativeAgentId) {
    const botId = await copilotStudioClient.getBot(accessToken, context.declarativeAgentId);
    context.teamsBotId = botId;
  }
}

async function updateEnv(context: DeclarativeAgentBotContext): Promise<void> {
  if (context.teamsBotId) {
    await envUtil.writeEnv(context.projectPath, context.env, {
      BOT_ID: context.teamsBotId,
    });
  }
}

async function rollbackExecution(context: DeclarativeAgentBotContext): Promise<void> {
  await context.cleanModifiedPaths();
  await context.restoreBackup();
  await context.cleanBackup();
}
