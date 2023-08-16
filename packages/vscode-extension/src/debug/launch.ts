// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { VS_CODE_UI } from "../extension";
import * as constants from "./constants";
import VsCodeLogInstance from "../commonlib/log";
import { Hub } from "@microsoft/teamsfx-core";

export async function openHubWebClient(hub: Hub, url: string): Promise<void> {
  VsCodeLogInstance.info(constants.sideloadingDisplayMessages.title(hub));
  VsCodeLogInstance.outputChannel.appendLine("");
  VsCodeLogInstance.outputChannel.appendLine(
    constants.sideloadingDisplayMessages.sideloadingUrlMessage(hub, url)
  );

  await VS_CODE_UI.openUrl(url);
}
