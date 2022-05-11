// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { VS_CODE_UI } from "../extension";
import graphLoginInstance from "../commonlib/graphLogin";
import { ExtensionErrors, ExtensionSource } from "../error";
import { localize } from "../utils/localizeUtils";
import { delay } from "../utils/commonUtils";
import { generateAccountHint } from "./teamsfxDebugProvider";
import * as commonUtils from "./commonUtils";

import axios from "axios";
import { UserError, SystemError } from "@microsoft/teamsfx-api";
import { environmentManager, isConfigUnifyEnabled } from "@microsoft/teamsfx-core";

export async function showInstallAppInTeamsMessage(
  detected: boolean,
  appId: string,
  botId: string | undefined
): Promise<boolean> {
  const messages = botId
    ? [
        localize("teamstoolkit.localDebug.installApp.bot.description"),
        localize("teamstoolkit.localDebug.installApp.bot.guide1"),
        localize("teamstoolkit.localDebug.installApp.bot.guide2"),
        localize("teamstoolkit.localDebug.installApp.bot.finish"),
      ]
    : [
        localize("teamstoolkit.localDebug.installApp.description"),
        localize("teamstoolkit.localDebug.installApp.guide"),
        localize("teamstoolkit.localDebug.installApp.finish"),
      ];
  const message = messages.join("\n\n");
  const items = [localize("teamstoolkit.localDebug.installApp.installInTeams")];
  if (botId) {
    items.push(localize("teamstoolkit.localDebug.installApp.bot.configureOutlook"));
  }
  items.push(localize("teamstoolkit.localDebug.installApp.continue"));
  const result = await VS_CODE_UI.showMessage("info", message, true, ...items);
  if (result.isOk()) {
    if (result.value === localize("teamstoolkit.localDebug.installApp.cancel")) {
      return false;
    }

    const debugConfig = isConfigUnifyEnabled()
      ? await commonUtils.getDebugConfig(false, environmentManager.getLocalEnvName())
      : await commonUtils.getDebugConfig(true);
    if (debugConfig?.appId === undefined) {
      throw new UserError(
        ExtensionSource,
        ExtensionErrors.GetTeamsAppInstallationFailed,
        "Debug config not found"
      );
    }

    if (result.value === localize("teamstoolkit.localDebug.installApp.installInTeams")) {
      const url = `https://teams.microsoft.com/l/app/${appId}?installAppPackage=true&webjoin=true&${await generateAccountHint()}`;
      await VS_CODE_UI.openUrl(url);
      return await showInstallAppInTeamsMessage(false, appId, botId);
    } else if (
      result.value === localize("teamstoolkit.localDebug.installApp.bot.configureOutlook")
    ) {
      const url = `https://dev.botframework.com/bots/channels?id=${botId}&channelId=outlook`;
      await VS_CODE_UI.openUrl(url);
      return await showInstallAppInTeamsMessage(false, appId, botId);
    } else if (result.value === localize("teamstoolkit.localDebug.installApp.continue")) {
      const internalId = await getTeamsAppInternalId(appId);
      return internalId === undefined
        ? await showInstallAppInTeamsMessage(true, appId, botId)
        : true;
    }
  }
  return false;
}

export async function getTeamsAppInternalId(appId: string): Promise<string | undefined> {
  const loginStatus = await graphLoginInstance.getStatus();
  if (loginStatus.accountInfo?.oid === undefined || loginStatus.token === undefined) {
    throw new UserError(
      ExtensionSource,
      ExtensionErrors.GetTeamsAppInstallationFailed,
      "M365 account info not found"
    );
  }
  const url = `https://graph.microsoft.com/v1.0/users/${loginStatus.accountInfo.oid}/teamwork/installedApps?$expand=teamsApp,teamsAppDefinition&$filter=teamsApp/externalId eq '${appId}'`;
  let numRetries = 3;
  while (numRetries > 0) {
    try {
      --numRetries;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${loginStatus.token}` },
      });
      for (const teamsAppInstallation of response.data.value) {
        if (teamsAppInstallation.teamsApp.distributionMethod === "sideloaded") {
          return teamsAppInstallation.teamsApp.id;
        }
      }
      return undefined;
    } catch (error: any) {
      if (numRetries === 0) {
        throw new SystemError({
          source: ExtensionSource,
          error,
          name: ExtensionErrors.GetTeamsAppInstallationFailed,
        });
      }
      await delay(1000);
    }
  }
}
