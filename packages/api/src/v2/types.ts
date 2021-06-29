// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Platform, VsCodeEnv } from "../constants";
import { UserInteraction } from "../qm/ui";
import { LogProvider, TelemetryReporter } from "../utils"; 
 
// eslint-disable-next-line @typescript-eslint/ban-types
export type Void = {};
export const Void = {};
  

/**
 * environment meta data
 */
export interface EnvMeta{
    name:string,
    local:boolean,
    sideloading:boolean
}

export type Json = Record<string,unknown>;

/**
 * project static setting
 */
export interface ProjectSetting extends Json{
    name:string,
    environments: Record<string,EnvMeta>;
    currentEnv: string;
    solution: {
      name: string,
      version?:string,
    }
    solutionSetting:SolutionSetting;
}

export interface SolutionSetting extends Json{
    resourcePlugins:string[];
}

export interface ProjectState extends Json{
  solutionState: Json;
}

export interface Inputs extends Json{
    projectPath:string;
    platform: Platform;
    vscodeEnv?:VsCodeEnv;
}    
  
export interface Context {
    projectPath: string;
    userInteraction: UserInteraction;
    logProvider: LogProvider;
    telemetryReporter: TelemetryReporter;
    projectSetting: ProjectSetting; 
    projectState: ProjectState;
    projectSecrets: Json;
}
 
/**
 * project config model
 */
export interface ProjectConfigs{
    projectSetting: ProjectSetting; 
    projectState: ProjectState;
    provisionTemplates?:Record<string, Json>;
    deployTemplates?: Record<string, Json>;
    provisionConfigs?:Record<string, Json>;
    deployConfigs?: Record<string, Json>;
    resourceInstanceValues?: Record<string, string>;
    stateValues?: Record<string, string>;
}