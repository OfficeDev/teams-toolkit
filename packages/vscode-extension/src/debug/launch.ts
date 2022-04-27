// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import open = require("open");
import * as util from "util";

import { ExtensionErrors, ExtensionSource } from "../error";
import { VS_CODE_UI } from "../extension";
import { showError } from "../handlers";
import { getDefaultString, localize } from "../utils/localizeUtils";
import * as constants from "./constants";
import { generateAccountHint } from "./teamsfxDebugProvider";

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

export async function openUrlInPrivateWindow(url: string): Promise<void> {
  try {
    await open(url, {
      app: [
        {
          name: open.apps.chrome,
          arguments: ["--incognito"],
        },
        {
          name: open.apps.edge,
          arguments: ["-inprivate"],
        },
        {
          name: open.apps.firefox,
          arguments: ["-private"],
        },
      ],
    });
  } catch {
    const error = new UserError(
      ExtensionSource,
      ExtensionErrors.OpenBrowserFailed,
      util.format(getDefaultString("teamstoolkit.localDebug.openBrowserFailed"), url),
      util.format(localize("teamstoolkit.localDebug.openBrowserFailed"), url)
    );
    showError(error);
  }
}
