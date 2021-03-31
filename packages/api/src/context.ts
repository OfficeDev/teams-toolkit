// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ConfigMap, ResourceConfig, ReadonlyResourceConfig, SolutionConfig, Env } from "./types";
import { Dialog } from "./utils/dialog";
import { TreeProvider } from "./utils/tree"; 
import { LogProvider, TelemetryReporter } from "./utils";



/*
 * Context is env independent
 */
export interface Context {
    /**
     * project folder path, no need to persist
     */
    path: string;

    /**
     * appName is shared between framework and plugins, need to persist in settins.json
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
}

/**
 * SolutionContext is env dependent
 */
export interface SolutionContext extends Context {

    env: Env;
    /**
     * can solution read-write config file instead of core? for task like provision, the progress is long, solution can save the templary result before provision finish.
     * If so, SolutionConfig is unecessary here
     */
    config: SolutionConfig;

    state: ConfigMap;

    // Tree provider is undefined for non-vscode drivers.
    treeProvider?: TreeProvider;
}

/**
 * ResourceContext is env dependent
 */
export interface ResourceContext extends Context {
    
    env: Env;

    /**
     * A readonly view of solution's config which stores answers to common questions shared by all plugins. e.g. Azure Location, tenantId, etc.
     */
    commonConfig: ReadonlyResourceConfig;

    // A mutable config for current plugin
    config: ResourceConfig;

    // A readonly of view of teams manifest. Useful for bot plugin.
    //TODO optional? for SPFx plugin, this app property is undefined
    // app?: Readonly<TeamsAppManifest>;

    state: ConfigMap;
}
