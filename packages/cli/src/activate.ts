// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Result, FxError, err, ok, Core, UserError, SystemError, ConfigMap, RemoteFuncExecutor, Func, Inputs } from "@microsoft/teamsfx-api";

import AzureAccountManager from "./commonlib/azureLogin";
import AppStudioTokenProvider from "./commonlib/appStudioLogin";
import GraphTokenProvider from "./commonlib/graphLogin";
import CLILogProvider from "./commonlib/log";
import { UnknownError } from "./error";
import DialogManagerInstance from "./userInterface";
import { getSubscriptionIdFromEnvFile } from "./utils";
import { CliTelemetry } from "./telemetry/cliTelemetry";
import CLIUIInstance from "./userInteraction";

const coreAsync: Promise<Core> = new Promise(async (resolve) => {
  const corePkg = await import("@microsoft/teamsfx-core");
  return resolve(corePkg.CoreProxy.getInstance());
});

export const coreExeceutor: RemoteFuncExecutor = async function(
  func: Func,
  answers: ConfigMap
): Promise<Result<any, FxError>> {
  const core = await coreAsync;
  return core.callFunc!(func, answers as ConfigMap);
};

export default async function activate(rootPath?: string): Promise<Result<Core, FxError>> {
  if (rootPath) {
    const subscription = await getSubscriptionIdFromEnvFile(rootPath);
    if (subscription) {
      await AzureAccountManager.setSubscription(subscription);
    }
  }

  const core = await coreAsync;
  try {
    {
      const result = await core.withDialog(DialogManagerInstance, CLIUIInstance);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    {
      const result = await core.withAzureAccount(AzureAccountManager);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    {
      const result = await core.withAppStudioToken(AppStudioTokenProvider);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    {
      const result = await core.withGraphToken(GraphTokenProvider);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    {
      if (rootPath) {
        CliTelemetry.setReporter(CliTelemetry.getReporter().withRootFolder(rootPath));
      }
      const result = await core.withTelemetry(CliTelemetry.getReporter());
      if (result.isErr()) {
        return err(result.error);
      }
    }

    {
      const result = await core.withLogger(CLILogProvider);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    {
      const globalConfig = new ConfigMap();
      globalConfig.set("featureFlag", true);
      const result = await core.init(globalConfig);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    {
      const result = await core.open(rootPath);
      if (result.isErr()) {
        return err(result.error);
      }
    }
    return ok(core);
  } catch (e) {
    const FxError: FxError =
      e instanceof UserError || e instanceof SystemError ? e : UnknownError(e);
    return err(FxError);
  }
}
