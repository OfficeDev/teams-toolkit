// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import open from "open";
import * as os from "os";
import * as path from "path";

import { OpeningBrowserFailed } from "./errors";
import CLIUIInstance from "../../userInteraction";
import * as constants from "./constants";
import cliLogger from "../../commonlib/log";
import * as commonUtils from "./commonUtils";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { Colors, LogLevel, ok, err, FxError, Result } from "@microsoft/teamsfx-api";
import { getColorizedString, sleep } from "../../utils";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import { TempFolderManager } from "./tempFolderManager";
import { localTelemetryReporter } from "./localTelemetryReporter";

export async function openHubWebClient(
  includeFrontend: boolean,
  tenantIdFromConfig: string,
  appId: string,
  hub: string,
  browser: constants.Browser,
  browserArguments: string[] = [],
  telemetryProperties?: { [key: string]: string } | undefined
): Promise<void> {
  if (telemetryProperties !== undefined) {
    await localTelemetryReporter.runWithTelemetryProperties(
      TelemetryEvent.PreviewSideloading,
      telemetryProperties,
      () =>
        _openHubWebClient(
          includeFrontend,
          tenantIdFromConfig,
          appId,
          hub,
          browser,
          browserArguments
        )
    );
  } else {
    await _openHubWebClient(
      includeFrontend,
      tenantIdFromConfig,
      appId,
      hub,
      browser,
      browserArguments
    );
  }
}

async function _openHubWebClient(
  includeFrontend: boolean,
  tenantIdFromConfig: string,
  appId: string,
  hub: string,
  browser: constants.Browser,
  browserArguments: string[] = []
): Promise<Result<undefined, FxError>> {
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
    const error = OpeningBrowserFailed(browser);
    cliLogger.necessaryLog(LogLevel.Warning, constants.openBrowserHintMessage);
    await previewBar.end(false);
    return err(error);
  }
  await previewBar.end(true);
  return ok(undefined);
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
          await sleep(3000);
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
