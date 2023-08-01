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
  const core = createFxCore();
  return ok(core);
}

export function createFxCore(): FxCore {
  const tools: Tools = {
    logProvider: CLILogProvider,
    tokenProvider: {
      azureAccountProvider: AzureAccountManager,
      m365TokenProvider: M365Login,
    },
    telemetryReporter: CliTelemetry.reporter,
    ui: CLIUserInteraction,
  };
  const core = new FxCore(tools);
  return core;
}
