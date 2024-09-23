// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import { DeclarativeAgentContext } from "./declarativeAgentContext";
import { AppPackageFolderName } from "@microsoft/teamsfx-api";
import { MetadataV3 } from "../../common/versionMetadata";
import { manifestUtils } from "../driver/teamsApp/utils/ManifestUtils";
import { copilotGptManifestUtils } from "../driver/teamsApp/utils/CopilotGptManifestUtils";
import { CopilotStudioScopes } from "../../common/constants";
import { DeclarativeAgentBotDefinition } from "./declarativeAgentDefinition";

const launchJsonFile = ".vscode/launch.json";
const backupFolder = ".backup";

export async function updateLaunchJson(context: DeclarativeAgentContext): Promise<void> {
  const launchJsonPath = path.join(context.projectPath, launchJsonFile);
  if (await fs.pathExists(launchJsonPath)) {
    await backup(context, launchJsonPath);
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
    await fs.writeFile(launchJsonPath, launchJsonContent, "utf8");
  }
}

export async function uppdateManifest(context: DeclarativeAgentContext): Promise<void> {
  const manifestPath = path.join(AppPackageFolderName, MetadataV3.teamsManifestFileName);
  if (await fs.pathExists(manifestPath)) {
    await backup(context, manifestPath);
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
    await fs.writeFile(manifestPath, manifest);
  }
}

export async function provisionBot(context: DeclarativeAgentContext): Promise<void> {
  const copilotGptManifestPath = path.join(
    context.projectPath,
    context.declarativeAgentManifestPath
  );
  const copilotGptManifest = await copilotGptManifestUtils.readCopilotGptManifestFile(
    copilotGptManifestPath
  );
  if (copilotGptManifest.isErr()) {
    return;
  }

  // construct payload for bot provisioning
  const payload: DeclarativeAgentBotDefinition = {
    GptDefinition: {
      id: copilotGptManifest.value.id,
      name: copilotGptManifest.value.name,
      description: copilotGptManifest.value.description,
      instructions: copilotGptManifest.value.instructions,
    },
    PersistentModel: 1,
    EnableChannels: ["msteams"],
  };

  // provision bot
  const result = await context.tokenProvider.getAccessToken({
    scopes: CopilotStudioScopes,
  });

  if (result.isErr()) {
    return;
  }

  const copilotStudioAccessToken = result.value;
}

async function backup(context: DeclarativeAgentContext, filePath: string): Promise<void> {
  const backupDir = path.join(context.projectPath, backupFolder);
  await fs.ensureDir(backupDir);
  const backupFilePath = path.join(backupDir, path.basename(filePath));
  await fs.copyFile(filePath, backupFilePath);
}
