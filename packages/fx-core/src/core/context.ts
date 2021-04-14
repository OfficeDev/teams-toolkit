// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  AzureAccountProvider,
  ConfigMap,
  Context,
  Dialog,
  GraphTokenProvider,
  LogProvider,
  Platform,
  TelemetryReporter,
  AppStudioTokenProvider,
  TreeProvider,
  Stage,
  SolutionConfig,
  Solution,
  SolutionContext,
  TeamsAppManifest,
  ProjectSettings,
  VsCode,
} from "fx-api";

import { Meta } from "./loader";
import * as tools from "./tools";
import { VscodeManager } from "./vscodeManager";

export class CoreContext implements SolutionContext {
  public globalConfig?: ConfigMap;
  public globalSolutions: Map<string, Solution & Meta>;

  public dialog?: Dialog;
  public logProvider?: LogProvider;
  public telemetryReporter?: TelemetryReporter;
  public azureAccountProvider?: AzureAccountProvider;
  public graphTokenProvider?: GraphTokenProvider;
  public appStudioToken?: AppStudioTokenProvider;
  public treeProvider?: TreeProvider;

  public root: string;
  public configs: Map<string, SolutionConfig>;
  public env: string;
  public stage: Stage;
  public platform: Platform;
  public selectedSolution?: Solution & Meta;
  public answers?: ConfigMap;
  public projectSettings?: ProjectSettings;

  // for solution
  public dotVsCode?: VsCode;
  public app: TeamsAppManifest;
  public config: SolutionConfig;

  public constructor(c: Context) {
    this.globalConfig = c.globalConfig;

    this.dialog = c.dialog;
    this.logProvider = c.logProvider;
    this.telemetryReporter = c.telemetryReporter;
    this.azureAccountProvider = c.azureAccountProvider;
    this.graphTokenProvider = c.graphTokenProvider;
    this.appStudioToken = c.appStudioToken;
    this.treeProvider = c.treeProvider;

    this.root = c.root;
    this.stage = c.stage;
    this.env = "default";
    this.platform = c.platform;
    this.answers = c.answers;
    this.configs = new Map();
    this.globalSolutions = new Map();

    this.app = new TeamsAppManifest();
    this.config = new Map<string, ConfigMap>();
  }

  public toSolutionContext(answers?: ConfigMap): CoreContext {
    const allAnswers = tools.mergeConfigMap(this.globalConfig, this.answers);
    if (this.stage === Stage.create) {
      this.answers = allAnswers;
    } else {
      this.answers = tools.mergeConfigMap(allAnswers, answers);
    }
    return this;
  }
}
