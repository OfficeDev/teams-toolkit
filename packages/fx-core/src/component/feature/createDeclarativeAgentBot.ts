// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";

import { AppPackageFolderName, IBot, InputsWithProjectPath } from "@microsoft/teamsfx-api";

import { copilotStudioClient } from "../../client/copilotStudioClient";
import { CopilotStudioScopes } from "../../common/constants";
import { TOOLS } from "../../common/globalVars";
import { getUuid } from "../../common/stringUtils";
import { MetadataV3 } from "../../common/versionMetadata";
import { copilotGptManifestUtils } from "../driver/teamsApp/utils/CopilotGptManifestUtils";
import { manifestUtils } from "../driver/teamsApp/utils/ManifestUtils";
import { loadStateFromEnv } from "../driver/util/utils";
import { DeclarativeAgentBotContext } from "./declarativeAgentBotContext";
import { DeclarativeAgentBotDefinition } from "./declarativeAgentDefinition";

const launchJsonFile = ".vscode/launch.json";
const defaultOutputNames = {
  m365AppId: "M365_APP_ID",
  tenantId: "TEAMS_APP_TENANT_ID",
};

export async function create(context: DeclarativeAgentBotContext): Promise<void> {
  await wrapExecution(context);
}

async function wrapExecution(context: DeclarativeAgentBotContext): Promise<void> {
  try {
    await updateLaunchJson(context);
    await updateManifest(context);
    await provisionBot(context);
    await getBotId(context);
  } catch (error: unknown) {
    await rollbackExecution(context);
    throw error;
  }
}

async function updateLaunchJson(context: DeclarativeAgentBotContext): Promise<void> {
  const launchJsonPath = path.join(context.projectPath, launchJsonFile);
  if (await fs.pathExists(launchJsonPath)) {
    await context.backup(launchJsonFile);
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
    await context.fsWriteFile(launchJsonFile, launchJsonContent, "utf8");
  }
}

async function updateManifest(context: DeclarativeAgentBotContext): Promise<void> {
  const manifestFile = path.join(AppPackageFolderName, MetadataV3.teamsManifestFileName);
  const manifestPath = path.join(context.projectPath, manifestFile);
  if (await fs.pathExists(manifestPath)) {
    await context.backup(manifestFile);
    const botCapability: IBot = {
      botId: "${{BOT_ID}}",
      scopes: ["personal", "team", "groupChat"],
      supportsFiles: false,
      isNotificationOnly: false,
    };
    const inputs: InputsWithProjectPath = {
      platform: context.platform,
      addManifestPath: manifestPath,
      projectPath: context.projectPath,
    };
    await manifestUtils.addCapabilities(inputs, [{ name: "Bot", snippet: botCapability }]);
  }
}

async function provisionBot(context: DeclarativeAgentBotContext): Promise<void> {
  const agentManifest = await copilotGptManifestUtils.readCopilotGptManifestFile(
    context.agentManifestPath
  );
  if (agentManifest.isErr()) {
    throw agentManifest.error;
  }

  const state = loadStateFromEnv(new Map(Object.entries(defaultOutputNames)));
  if (!state.m365AppId || !state.tenantId) {
    throw new Error("M365 app id or tenant id is not found in .env file");
  }

  context.agentId = getUuid();

  // construct payload for bot provisioning
  const payload: DeclarativeAgentBotDefinition = {
    GptDefinition: {
      id: context.agentId,
      name: agentManifest.value.name,
      teams_app_id: state.m365AppId,
    },
    PersistenceMode: 0,
    EnableChannels: ["msteams"],
    IsMultiTenant: context.multiTenant,
  };

  // provision bot
  const tokenResult = await TOOLS.tokenProvider.m365TokenProvider.getAccessToken({
    scopes: CopilotStudioScopes,
  });

  if (tokenResult.isErr()) {
    throw tokenResult.error;
  }

  await copilotStudioClient.createBot(tokenResult.value, payload, state.tenantId);
  await context.writeEnv("AGENT_ID", context.agentId);
}

async function getBotId(context: DeclarativeAgentBotContext): Promise<void> {
  const tokenResult = await TOOLS.tokenProvider.m365TokenProvider.getAccessToken({
    scopes: CopilotStudioScopes,
  });

  if (tokenResult.isErr()) {
    throw tokenResult.error;
  }

  const state = loadStateFromEnv(new Map(Object.entries(defaultOutputNames)));
  if (!state.m365AppId || !state.tenantId) {
    throw new Error("M365 app id or tenant id is not found in .env file");
  }

  const accessToken = tokenResult.value;
  if (context.agentId) {
    const botId = await copilotStudioClient.getBot(accessToken, context.agentId, state.tenantId);
    context.teamsBotId = botId;
    await context.writeEnv("BOT_ID", botId);
  }
}

async function rollbackExecution(context: DeclarativeAgentBotContext): Promise<void> {
  await context.cleanModifiedPaths();
  await context.restoreBackup();
  await context.cleanBackup();
}
