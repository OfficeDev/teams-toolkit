// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as os from "os";
import { Context, ConfigMap } from "fx-api";

import GraphManagerInstance from "./commonlib/graphLogin";
import AzureAccountManager from "./commonlib/azureLoginCI";
import AppStudioTokenProvider from "./commonlib/appStudioLogin";
import CLILogProvider from "./commonlib/log";
import DialogManagerInstance from "./userInterface";

export class ContextFactory {
  public static get(rootPath?: string): Context {
    const globalConfig = new ConfigMap();
    return {
      root: rootPath ?? `${os.homedir()}/teams`,
      dialog: DialogManagerInstance,
      logProvider: CLILogProvider,
      azureAccountProvider: AzureAccountManager,
      graphTokenProvider: GraphManagerInstance,
      appStudioToken: AppStudioTokenProvider,
      globalConfig: globalConfig
    };
  }
}
