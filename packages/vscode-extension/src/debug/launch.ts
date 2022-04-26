// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { VS_CODE_UI } from "../extension";
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
