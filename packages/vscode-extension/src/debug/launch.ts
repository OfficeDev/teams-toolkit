// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConfigFolderName } from "@microsoft/teamsfx-api";
import open = require("open");
import * as os from "os";
import * as path from "path";

import { VS_CODE_UI } from "../extension";
import * as constants from "./constants";
import { generateAccountHint } from "./teamsfxDebugProvider";
import { TempFolderManager } from "./tempFolderManager";

export async function openHubWebClient(
  includeFrontend: boolean,
  appId: string,
  hub: constants.Hub
): Promise<void> {
  let sideloadingUrl = "";
  if (hub === constants.Hub.teams) {
    sideloadingUrl = constants.LaunchUrl.teams;
  } else if (hub === constants.Hub.outlook) {
    sideloadingUrl = includeFrontend
      ? constants.LaunchUrl.outlookTab
      : constants.LaunchUrl.outlookBot;
  } else if (hub === constants.Hub.office) {
    sideloadingUrl = constants.LaunchUrl.officeTab;
  }

  sideloadingUrl = sideloadingUrl.replace(constants.teamsAppIdPlaceholder, appId);
  sideloadingUrl = sideloadingUrl.replace(constants.teamsAppInternalIdPlaceholder, appId);
  const accountHint = await generateAccountHint(hub === constants.Hub.teams);
  sideloadingUrl = sideloadingUrl.replace(constants.accountHintPlaceholder, accountHint);

  await VS_CODE_UI.openUrl(sideloadingUrl);
}

export async function openUrlWithNewProfile(url: string): Promise<boolean> {
  try {
    const basePath = path.join(os.homedir(), `.${ConfigFolderName}`, ".tmp", "browser-profile");
    const tempFolderManager = new TempFolderManager(basePath, 10);
    const profileFolderPath = await tempFolderManager.getTempFolderPath();
    if (profileFolderPath === undefined) {
      return false;
    }
    await open(url, {
      app: [
        {
          name: open.apps.chrome,
          arguments: [`--user-data-dir=${profileFolderPath}`],
        },
        {
          name: open.apps.edge,
          arguments: [`--user-data-dir=${profileFolderPath}`],
        },
        {
          name: open.apps.firefox,
          arguments: ["-profile", profileFolderPath],
        },
      ],
    });

    return true;
  } catch {
    // ignore any error
    return false;
  }
}
