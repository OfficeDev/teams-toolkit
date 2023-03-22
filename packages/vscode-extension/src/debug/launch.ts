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
import { delay } from "../utils/commonUtils";
import VsCodeLogInstance from "../commonlib/log";

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

  VsCodeLogInstance.info(constants.sideloadingDisplayMessages.title(hub));
  VsCodeLogInstance.outputChannel.appendLine("");
  VsCodeLogInstance.outputChannel.appendLine(
    constants.sideloadingDisplayMessages.sideloadingUrlMessage(hub, sideloadingUrl)
  );

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

    const tryToOpen = async (
      url: string,
      app: { name: string | readonly string[]; arguments: string[] }
    ) => {
      return new Promise<boolean>(async (resolve) => {
        try {
          const cp = await open(url, {
            app,
          });
          cp.once("close", (code) => {
            resolve(code === 0);
          });
          // NOTE: if app is not existing in the system, open will not throw but cp will exit immediately.
          // So we may assume that if cp does not exit after 3s, the app is launched successfully.
          await delay(3000);
          if (cp.exitCode !== null && cp.exitCode !== 0) {
            resolve(false);
          }
          resolve(true);
        } catch {
          resolve(false);
        }
      });
    };

    const apps = [
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
    ];
    for (const app of apps) {
      if (await tryToOpen(url, app)) {
        return true;
      }
    }
    return false;
  } catch {
    // ignore any error
    return false;
  }
}
