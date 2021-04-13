// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Context, ConfigMap } from "fx-api";
import { MockDialog } from "./dialog";
import { MockAzureAccountProvider } from "./azure";
import { MockLogger } from "./logger";
import { MockTelemetry } from "./telemetry";
import { MockGraphLogin } from "./graph";
import { MockAppStudioTokenProvider } from "./appstudio";

import * as os from "os";

export class ContextFactory {
  public static get(workspace?: string): Context {
    const globalConfig = new ConfigMap();
    return {
      root: workspace ?? `${os.homedir()}/teams`,
      dialog: MockDialog.getInstance(),
      logProvider: MockLogger.getInstance(),
      telemetryReporter: MockTelemetry.getInstance(),
      azureAccountProvider: MockAzureAccountProvider.getInstance(),
      graphTokenProvider: MockGraphLogin.getInstance(),
      appStudioToken: MockAppStudioTokenProvider.getInstance(),
      globalConfig: globalConfig,
    };
  }
}
