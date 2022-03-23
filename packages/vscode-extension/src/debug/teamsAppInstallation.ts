// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { VS_CODE_UI } from "../extension";
import graphLoginInstance from "../commonlib/graphLogin";
import { ExtensionErrors, ExtensionSource } from "../error";
import { localize } from "../utils/localizeUtils";
import { delay } from "../utils/commonUtils";
import { generateAccountHint } from "./teamsfxDebugProvider";

import axios from "axios";
import { returnSystemError, returnUserError } from "@microsoft/teamsfx-api";

export async function showInstallAppInTeamsMessage(
  detected: boolean,
  appId: string
): Promise<boolean> {
  const message = `${
    detected
      ? localize("teamstoolkit.localDebug.installApp.detection")
      : localize("teamstoolkit.localDebug.installApp.description")
  }${localize("teamstoolkit.localDebug.installApp.guide")}`;
  const result = await VS_CODE_UI.showMessage(
    "info",
    message,
    true,
    localize("teamstoolkit.localDebug.installApp.installInTeams"),
    localize("teamstoolkit.localDebug.installApp.continue")
  );
  if (result.isOk()) {
    if (result.value === localize("teamstoolkit.localDebug.installApp.cancel")) {
      return false;
    }

    if (result.value === localize("teamstoolkit.localDebug.installApp.installInTeams")) {
      const url = `https://teams.microsoft.com/l/app/${appId}?installAppPackage=true&webjoin=true&${await generateAccountHint()}`;
      await VS_CODE_UI.openUrl(url);
      return await showInstallAppInTeamsMessage(false, appId);
    } else if (result.value === localize("teamstoolkit.localDebug.installApp.continue")) {
      const internalId = await getTeamsAppInternalId(appId);
      return internalId === undefined ? await showInstallAppInTeamsMessage(true, appId) : true;
    }
  }
  return false;
}

export async function getTeamsAppInternalId(appId: string): Promise<string | undefined> {
  const loginStatus = await graphLoginInstance.getStatus();
  if (loginStatus.accountInfo?.oid === undefined || loginStatus.token === undefined) {
    throw returnUserError(
      new Error("M365 account info not found"),
      ExtensionSource,
      ExtensionErrors.GetTeamsAppInstallationFailed
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
        throw returnSystemError(
          error,
          ExtensionSource,
          ExtensionErrors.GetTeamsAppInstallationFailed
        );
      }
      await delay(1000);
    }
  }
}
