// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Result, FxError, err, ok, Inputs, Tools } from "@microsoft/teamsfx-api";

import { FxCore } from "@microsoft/teamsfx-core";

import AzureAccountManager from "./commonlib/azureLogin";
import AppStudioTokenProvider from "./commonlib/appStudioLogin";
import GraphTokenProvider from "./commonlib/graphLogin";
import CLILogProvider from "./commonlib/log";
import DialogManagerInstance from "./userInterface";
import { getSubscriptionIdFromEnvFile, getSystemInputs } from "./utils";
import { CliTelemetry } from "./telemetry/cliTelemetry";
import CLIUIInstance from "./userInteraction";

export default async function activate(rootPath?: string): Promise<Result<FxCore, FxError>> {
  if (rootPath) {
    const subscription = await getSubscriptionIdFromEnvFile(rootPath);
    if (subscription) {
      await AzureAccountManager.setSubscription(subscription);
    }
    CliTelemetry.setReporter(CliTelemetry.getReporter().withRootFolder(rootPath));
  }

  const tools: Tools = {
    logProvider: CLILogProvider,
    tokenProvider: {
      azureAccountProvider: AzureAccountManager,
      graphTokenProvider: GraphTokenProvider,
      appStudioToken: AppStudioTokenProvider
    },
    telemetryReporter: CliTelemetry.getReporter(),
    dialog: DialogManagerInstance,
    ui: CLIUIInstance
  };
  const core = new FxCore(tools);
  const systemInputs: Inputs = getSystemInputs(rootPath);
  
  const result = await core.init(systemInputs);
  if (result.isErr()) {
    return err(result.error);
  }
  return ok(core);
}
