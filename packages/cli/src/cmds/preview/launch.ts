// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { OpeningBrowserFailed } from "./errors";
import CLIUIInstance from "../../userInteraction";
import * as constants from "./constants";
import cliLogger from "../../commonlib/log";
import * as commonUtils from "./commonUtils";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { Colors, LogLevel, ok, err, FxError, Result } from "@microsoft/teamsfx-api";
import { getColorizedString } from "../../utils";
import { localTelemetryReporter } from "./localTelemetryReporter";
import { Hub } from "@microsoft/teamsfx-core/build/common/m365/constants";

export async function openHubWebClientNew(
  hub: Hub,
  url: string,
  browser: constants.Browser,
  browserArguments: string[] = [],
  telemetryProperties?: { [key: string]: string } | undefined
): Promise<void> {
  if (telemetryProperties !== undefined) {
    await localTelemetryReporter.runWithTelemetryProperties(
      TelemetryEvent.PreviewSideloading,
      telemetryProperties,
      () => _openHubWebClientNew(hub, url, browser, browserArguments)
    );
  } else {
    await _openHubWebClientNew(hub, url, browser, browserArguments);
  }
}

async function _openHubWebClientNew(
  hub: Hub,
  url: string,
  browser: constants.Browser,
  browserArguments: string[] = []
): Promise<Result<undefined, FxError>> {
  const message = [
    {
      content: `${hub} web client is being launched for you to preview the app: `,
      color: Colors.WHITE,
    },
    {
      content: url,
      color: Colors.BRIGHT_CYAN,
    },
  ];
  cliLogger.necessaryLog(LogLevel.Info, getColorizedString(message));

  const previewBar = CLIUIInstance.createProgressBar(constants.previewTitle, 1);
  await previewBar.start(constants.previewStartMessage);
  await previewBar.next(constants.previewStartMessage);
  try {
    await commonUtils.openBrowser(browser, url, browserArguments);
  } catch {
    const error = OpeningBrowserFailed(browser);
    cliLogger.necessaryLog(LogLevel.Warning, constants.openBrowserHintMessage);
    await previewBar.end(false);
    return err(error);
  }
  await previewBar.end(true);
  return ok(undefined);
}
