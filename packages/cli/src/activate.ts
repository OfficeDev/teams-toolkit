// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, err, Tools, ok } from "@microsoft/teamsfx-api";
import { FxCore, UnhandledError } from "@microsoft/teamsfx-core";
import AzureAccountManager from "./commonlib/azureLogin";
import CLILogProvider from "./commonlib/log";
import M365Login from "./commonlib/m365Login";
import CliTelemetry from "./telemetry/cliTelemetry";
import CLIUserInteraction from "./userInteraction";
import { cliSource } from "./constants";

export default async function activate(
  rootPath?: string,
  shouldIgnoreSubscriptionNotFoundError?: boolean
): Promise<Result<FxCore, FxError>> {
  if (rootPath) {
    try {
      AzureAccountManager.setRootPath(rootPath); //legacy code
      const subscriptionInfo = await AzureAccountManager.readSubscription();
      if (subscriptionInfo) {
        await AzureAccountManager.setSubscription(subscriptionInfo.subscriptionId);
      }
      CliTelemetry.reporter?.withRootFolder(rootPath);
    } catch (e) {
      if (!shouldIgnoreSubscriptionNotFoundError) {
        return err(new UnhandledError(e as Error, cliSource));
      }
    }
  }
  const core = getFxCore();
  return ok(core);
}
let fxCore: FxCore;
export function getFxCore(): FxCore {
  if (fxCore) return fxCore;
  const tools: Tools = {
    logProvider: CLILogProvider,
    tokenProvider: {
      azureAccountProvider: AzureAccountManager,
      m365TokenProvider: M365Login,
    },
    telemetryReporter: CliTelemetry.reporter,
    ui: CLIUserInteraction,
  };
  fxCore = new FxCore(tools);
  return fxCore;
}
