// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { VS_CODE_UI } from "../extension";
import m365LoginInstance from "../commonlib/m365Login";
import { ExtensionErrors, ExtensionSource } from "../error";
import { getDefaultString, localize } from "../utils/localizeUtils";
import { delay } from "../utils/commonUtils";
import { generateAccountHint } from "./teamsfxDebugProvider";
import * as commonUtils from "./commonUtils";

import axios from "axios";
import { UserError, SystemError } from "@microsoft/teamsfx-api";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { GraphScopes, isV3Enabled } from "@microsoft/teamsfx-core/build/common/tools";
import { openUrlWithNewProfile } from "./launch";

export async function showInstallAppInTeamsMessage(env: string, appId: string): Promise<boolean> {
  const isLocal = env === environmentManager.getLocalEnvName();
  const botId = isV3Enabled() ? undefined : await commonUtils.getBotId(env);

  let messages: string[] = [];
  const items = [localize("teamstoolkit.localDebug.installApp.installInTeams")];
  if (isV3Enabled()) {
    if (isLocal) {
      messages = [
        localize("teamstoolkit.localDebug.installApp.description"),
        localize("teamstoolkit.localDebug.installApp.guide"),
        localize("teamstoolkit.localDebug.installApp.finish"),
      ];
    } else {
      messages = [
        localize("teamstoolkit.preview.installApp.description"),
        localize("teamstoolkit.localDebug.installApp.guide"),
        localize("teamstoolkit.localDebug.installApp.finish"),
      ];
    }
  } else {
    messages = botId
      ? [
          isLocal
            ? localize("teamstoolkit.localDebug.installApp.bot.description")
            : localize("teamstoolkit.preview.installApp.bot.description"),
          localize("teamstoolkit.localDebug.installApp.bot.guide1"),
          isLocal
            ? localize("teamstoolkit.localDebug.installApp.bot.guide2")
            : localize("teamstoolkit.preview.installApp.bot.guide2"),
          localize("teamstoolkit.localDebug.installApp.bot.finish"),
        ]
      : [
          isLocal
            ? localize("teamstoolkit.localDebug.installApp.description")
            : localize("teamstoolkit.preview.installApp.description"),
          localize("teamstoolkit.localDebug.installApp.guide"),
          localize("teamstoolkit.localDebug.installApp.finish"),
        ];
    if (botId) {
      items.push(localize("teamstoolkit.localDebug.installApp.bot.configureOutlook"));
    }
  }
  items.push(localize("teamstoolkit.localDebug.installApp.continue"));
  const message = messages.join("\n\n");
  const result = await VS_CODE_UI.showMessage("info", message, true, ...items);
  if (result.isOk()) {
    if (result.value === localize("teamstoolkit.localDebug.installApp.cancel")) {
      return false;
    }

    if (result.value === localize("teamstoolkit.localDebug.installApp.installInTeams")) {
      const url = `https://teams.microsoft.com/l/app/${appId}?installAppPackage=true&webjoin=true&${await generateAccountHint()}`;
      await VS_CODE_UI.openUrl(url);
      return await showInstallAppInTeamsMessage(env, appId);
    } else if (
      result.value === localize("teamstoolkit.localDebug.installApp.bot.configureOutlook")
    ) {
      let url: string;
      if (isLocal) {
        url = `https://dev.botframework.com/bots/channels?id=${botId}&channelId=outlook`;
        if (!(await openUrlWithNewProfile(url))) {
          await VS_CODE_UI.openUrl(url);
        }
      } else {
        url = await commonUtils.getBotOutlookChannelLink(env);
        await VS_CODE_UI.openUrl(url);
      }
      return await showInstallAppInTeamsMessage(env, appId);
    } else if (result.value === localize("teamstoolkit.localDebug.installApp.continue")) {
      const internalId = await getTeamsAppInternalId(appId);
      return internalId === undefined ? await showInstallAppInTeamsMessage(env, appId) : true;
    }
  }
  return false;
}

export async function getTeamsAppInternalId(appId: string): Promise<string | undefined> {
  const loginStatusRes = await m365LoginInstance.getStatus({ scopes: GraphScopes });
  const loginStatus = loginStatusRes.isOk() ? loginStatusRes.value : undefined;
  if (loginStatus?.accountInfo?.oid === undefined || loginStatus.token === undefined) {
    throw new UserError(
      ExtensionSource,
      ExtensionErrors.GetTeamsAppInstallationFailed,
      getDefaultString("teamstoolkit.localDebug.installApp.m365AccountInfoNotFound"),
      localize("teamstoolkit.localDebug.installApp.m365AccountInfoNotFound")
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
