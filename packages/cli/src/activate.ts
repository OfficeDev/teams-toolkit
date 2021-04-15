// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Result, FxError, err, ok, Core, UserError, SystemError, ConfigMap } from "fx-api";

import AzureAccountManager from "./commonlib/azureLogin";
import AppStudioTokenProvider from "./commonlib/appStudioLogin";
import GraphTokenProvider from "./commonlib/graphLogin";
import CLILogProvider from "./commonlib/log";
import { UnknownError } from "./error";
import DialogManagerInstance from "./userInterface";

const coreAsync: Promise<Core> = new Promise(async (resolve) => {
  const corePkg = await import("fx-core");
  return resolve(corePkg.CoreProxy.getInstance());
});

export default async function activate(rootPath?: string): Promise<Result<Core, FxError>> {
  const core = await coreAsync;
  try {
    {
      const result = await core.withDialog(DialogManagerInstance);
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
