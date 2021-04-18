// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {Context, ConfigMap, Platform, Stage} from "fx-api";

import GraphManagerInstance from "./commonlib/graphLogin";
import AzureAccountManager from "./commonlib/azureLogin";
import AppStudioTokenProvider from "./commonlib/appStudioLogin";
import CLILogProvider from "./commonlib/log";
import DialogManagerInstance from "./userInterface";

export class ContextFactory {
  public static get(rootPath: string, stage: Stage): Context {
    const globalConfig = new ConfigMap();
    return {
      root: rootPath,
      stage: stage,
      dialog: DialogManagerInstance,
      logProvider: CLILogProvider,
      azureAccountProvider: AzureAccountManager,
      graphTokenProvider: GraphManagerInstance,
      appStudioToken: AppStudioTokenProvider,
      globalConfig: globalConfig,
      platform: Platform.CLI
    };
  }
}
