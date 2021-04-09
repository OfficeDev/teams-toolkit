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
} from "fx-api";

import { Meta } from "./loader";

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
}
