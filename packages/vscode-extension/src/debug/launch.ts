// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { VS_CODE_UI } from "../qm/vsc_ui";
import { sideloadingDisplayMessages } from "./common/debugConstants";
import VsCodeLogInstance from "../commonlib/log";
import { Hub } from "@microsoft/teamsfx-core";

export async function openHubWebClient(hub: Hub, url: string): Promise<void> {
  VsCodeLogInstance.info(sideloadingDisplayMessages.title(hub));
  VsCodeLogInstance.outputChannel.appendLine("");
  VsCodeLogInstance.outputChannel.appendLine(
    sideloadingDisplayMessages.sideloadingUrlMessage(hub, url)
  );

  await VS_CODE_UI.openUrl(url);
}
