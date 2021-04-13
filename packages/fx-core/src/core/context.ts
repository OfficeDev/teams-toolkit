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
} from "fx-api";

import { Meta } from "./loader";
import * as tools from "./tools";
import { CoreQuestionNames } from "./question";
import { VscodeManager } from "./vscodeManager";

export class CoreContext implements Context {
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
  public stage?: Stage;
  public platform?: Platform;
  public selectedSolution?: Solution & Meta;
  public answers?: ConfigMap;

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
    this.env = "default";
    this.platform = c.platform;
    this.answers = c.answers;
    this.configs = new Map();
    this.globalSolutions = new Map();
  }

  public toSolutionContext(answers?: ConfigMap): SolutionContext {
    const allAnswers = tools.mergeConfigMap(this.globalConfig, this.answers);
    const stage = allAnswers?.getString(CoreQuestionNames.Stage);
    const substage = allAnswers?.getString(CoreQuestionNames.SubStage);
    let sCtx: SolutionContext;
    if (
      "create" === stage &&
      ("getQuestions" === substage || "askQuestions" === substage)
    ) {
      // for create stage, SolutionContext is new and clean
      sCtx = {
        ...this,
        answers: allAnswers,
        app: new TeamsAppManifest(),
        config: new Map<string, ConfigMap>(),
        dotVsCode: VscodeManager.getInstance(),
        root: require("os").homedir() + "/teams_app/",
      };
    } else {
      sCtx = {
        ...this,
        answers: tools.mergeConfigMap(allAnswers, answers),
        app: new TeamsAppManifest(),
        config: this.configs.get(this.env)!,
        dotVsCode: VscodeManager.getInstance(),
      };
    }
    return sCtx;
  }
}
