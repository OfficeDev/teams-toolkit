// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import open from "open";

import { OpenBrowserFailed } from "./errors";
import CLIUIInstance from "../../userInteraction";
import * as constants from "./constants";
import cliTelemetry from "../../telemetry/cliTelemetry";
import cliLogger from "../../commonlib/log";
import * as commonUtils from "./commonUtils";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../telemetry/cliTelemetryEvents";
import { Colors, LogLevel } from "@microsoft/teamsfx-api";
import { getColorizedString } from "../../utils";

export async function openHubWebClient(
  includeFrontend: boolean,
  tenantIdFromConfig: string,
  appId: string,
  hub: string,
  browser: constants.Browser,
  browserArguments: string[] = [],
  telemetryProperties?: { [key: string]: string } | undefined
): Promise<void> {
  if (telemetryProperties) {
    cliTelemetry.sendTelemetryEvent(TelemetryEvent.PreviewSideloadingStart, telemetryProperties);
  }
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
  const accountHint = await commonUtils.generateAccountHint(
    tenantIdFromConfig,
    hub === constants.Hub.teams
  );
  sideloadingUrl = sideloadingUrl.replace(constants.accountHintPlaceholder, accountHint);

  const message = [
    {
      content: `preview url: `,
      color: Colors.WHITE,
    },
    {
      content: sideloadingUrl,
      color: Colors.BRIGHT_CYAN,
    },
  ];
  cliLogger.necessaryLog(LogLevel.Info, getColorizedString(message));

  const previewBar = CLIUIInstance.createProgressBar(constants.previewTitle, 1);
  await previewBar.start(constants.previewStartMessage);
  await previewBar.next(constants.previewStartMessage);
  try {
    await commonUtils.openBrowser(browser, sideloadingUrl, browserArguments);
  } catch {
    const error = OpenBrowserFailed(browser);
    if (telemetryProperties) {
      cliTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.PreviewSideloading,
        error,
        telemetryProperties
      );
    }
    cliLogger.necessaryLog(LogLevel.Warning, constants.openBrowserHintMessage);
    await previewBar.end(false);
    return;
  }
  await previewBar.end(true);

  if (telemetryProperties) {
    cliTelemetry.sendTelemetryEvent(TelemetryEvent.PreviewSideloading, {
      ...telemetryProperties,
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
  }
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
    const error = OpenBrowserFailed(undefined, url);
    cliLogger.warning(`${error.source}.${error.name}: ${error.message}`);
  }
}
