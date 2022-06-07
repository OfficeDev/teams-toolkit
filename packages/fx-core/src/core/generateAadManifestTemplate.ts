// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getTemplatesFolder } from "../folder";
import { Constants } from "../plugins/resource/aad/constants";
import * as fs from "fs-extra";
import * as os from "os";
import {
  ReplyUrlsWithType,
  RequiredResourceAccess,
} from "../plugins/resource/aad/interfaces/AADManifest";
import { AzureSolutionSettings } from "@microsoft/teamsfx-api";

interface Permission {
  resource: string;
  delegated: string[];
  application: string[];
}

export async function generateAadManifestTemplate(
  projectFolder: string,
  projectSettings: any,
  requiredResourceAccess: RequiredResourceAccess[] | undefined = undefined,
  updateCapabilities = false
): Promise<void> {
  const templatesFolder = getTemplatesFolder();
  const appDir = `${projectFolder}/${Constants.appPackageFolder}`;
  const aadManifestTemplate = `${templatesFolder}/${Constants.aadManifestTemplateFolder}/${Constants.aadManifestTemplateName}`;
  await fs.ensureDir(appDir);

  const azureSolutionSettings = projectSettings?.solutionSettings as AzureSolutionSettings;

  const aadManifestPath = `${appDir}/${Constants.aadManifestTemplateName}`;

  let aadJson;

  if (await fs.pathExists(aadManifestPath)) {
    aadJson = await fs.readJSON(aadManifestPath);
  } else {
    aadJson = await fs.readJSON(aadManifestTemplate);
  }

  if (!aadJson.replyUrlsWithType) {
    aadJson.replyUrlsWithType = [];
  }

  if (requiredResourceAccess) {
    aadJson.requiredResourceAccess = requiredResourceAccess;
  }

  if (azureSolutionSettings.capabilities.includes("Tab")) {
    const tabRedirectUrl1 =
      "{{state.fx-resource-aad-app-for-teams.frontendEndpoint}}/auth-end.html";

    if (!isRedirectUrlExist(aadJson.replyUrlsWithType, tabRedirectUrl1, "Web")) {
      aadJson.replyUrlsWithType.push({
        url: tabRedirectUrl1,
        type: "Web",
      });
    }

    const tabRedirectUrl2 =
      "{{state.fx-resource-aad-app-for-teams.frontendEndpoint}}/auth-end.html?clientId={{state.fx-resource-aad-app-for-teams.clientId}}";

    if (!isRedirectUrlExist(aadJson.replyUrlsWithType, tabRedirectUrl2, "Spa")) {
      aadJson.replyUrlsWithType.push({
        url: tabRedirectUrl2,
        type: "Spa",
      });
    }

    const tabRedirectUrl3 =
      "{{state.fx-resource-aad-app-for-teams.frontendEndpoint}}/blank-auth-end.html";

    if (!isRedirectUrlExist(aadJson.replyUrlsWithType, tabRedirectUrl3, "Spa")) {
      aadJson.replyUrlsWithType.push({
        url: tabRedirectUrl3,
        type: "Spa",
      });
    }
  }

  if (azureSolutionSettings.capabilities.includes("Bot")) {
    const botRedirectUrl = "{{state.fx-resource-aad-app-for-teams.botEndpoint}}/auth-end.html";

    if (!isRedirectUrlExist(aadJson.replyUrlsWithType, botRedirectUrl, "Web")) {
      aadJson.replyUrlsWithType.push({
        url: botRedirectUrl,
        type: "Web",
      });
    }
  }

  if (updateCapabilities) {
    if (
      projectSettings.solutionSettings.capabilities.includes("Tab") &&
      !projectSettings.solutionSettings.capabilities.includes("TabSSO")
    ) {
      projectSettings.solutionSettings.capabilities.push("TabSSO");
    }

    if (
      projectSettings.solutionSettings.capabilities.includes("Bot") &&
      !projectSettings.solutionSettings.capabilities.includes("BotSSO")
    ) {
      projectSettings.solutionSettings.capabilities.push("BotSSO");
    }
  }

  await fs.writeJSON(`${appDir}/${Constants.aadManifestTemplateName}`, aadJson, {
    spaces: 4,
    EOL: os.EOL,
  });
}

function isRedirectUrlExist(replyUrls: ReplyUrlsWithType[], url: string, type: string) {
  return (
    replyUrls.filter((item: ReplyUrlsWithType) => item.url === url && item.type === type).length > 0
  );
}
