// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ProjectSettings, ProjectStates } from "./config";
import { Dialog } from "./utils/dialog";
import { LogProvider, TelemetryReporter } from "./utils";



/*
 * Context is env independent
 */
export interface Context {
    /**
     * project folder path, not persist
     */
    path: string;

    /**
     * appName is shared between framework and plugins, need to persist
     */
    appName: string; 

    /**
     * dialog is a communication channel to the driver(vscode/CLI). Plugins and Solution can show progress bar and popup windows using dialog's APIs
     */
    dialog: Dialog;

    /**
     * log util tool
     */
    logProvider: LogProvider;

    /**
     * telemetry tool
     */
    telemetryReporter: TelemetryReporter;

    /**
     * Static meta data describing the settings or states of the project, for example, activated resources plugins
     */
    settings: ProjectSettings;

    /**
     * Dynamic data or temporary state of the project, for example, whether the project is built or not. Loss of such data will not affect the normal development workflow or such state data can be re-generated easily.
     */
    states: ProjectStates;
}
 