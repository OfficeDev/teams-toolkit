// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Result, FxError, ok, Tools, err } from "@microsoft/teamsfx-api";

import { FxCore } from "@microsoft/teamsfx-core";

import AzureAccountManager from "./commonlib/azureLogin";
import M365TokenProvider from "./commonlib/m365Login";
import CLILogProvider from "./commonlib/log";
import { CliTelemetry } from "./telemetry/cliTelemetry";
import CLIUIInstance from "./userInteraction";

export default async function activate(rootPath?: string): Promise<Result<FxCore, FxError>> {
  if (rootPath) {
    AzureAccountManager.setRootPath(rootPath);
    const subscriptionInfo = await AzureAccountManager.readSubscription();
    if (subscriptionInfo) {
      await AzureAccountManager.setSubscription(subscriptionInfo.subscriptionId);
    }
    CliTelemetry.setReporter(CliTelemetry.getReporter().withRootFolder(rootPath));
  }

  const tools: Tools = {
    logProvider: CLILogProvider,
    tokenProvider: {
      azureAccountProvider: AzureAccountManager,
      m365TokenProvider: M365TokenProvider,
    },
    telemetryReporter: CliTelemetry.getReporter(),
    ui: CLIUIInstance,
  };
  const core = new FxCore(tools);
  return ok(core);
}
