// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OptionItem , AnswerValue} from "./qm";
import { Platform, VsCodeEnv } from "./constants";
import { LogProvider, TelemetryReporter } from "./utils";
import { UserInterface } from "./ui";

export type ConfigValue =
    | string
    | string[]
    | number
    | number[]
    | boolean
    | boolean[]
    | OptionItem[]
    | OptionItem
    | undefined
    | unknown;
 
// eslint-disable-next-line @typescript-eslint/ban-types
export type Void = {};
export const Void = {};

export  interface Dict<T> {
    [key: string]: T | undefined;
}

export type ResourceTemplate = Dict<ConfigValue>;

export type ResourceTemplates = Dict<ResourceTemplate>;

export type ResourceConfig = ResourceTemplate;

export type ResourceConfigs = ResourceTemplates;

export type ReadonlyResourceConfig = Readonly<ResourceConfig>;

export type ReadonlyResourceConfigs = Readonly<{
    [k:string]:ReadonlyResourceConfig|undefined;
}>;


/**
 * environment meta data
 */
export interface EnvMeta{
    name:string,
    local:boolean,
    sideloading:boolean
}

export type VariableDict = Dict<string>;

/**
 * project static settings
 */
export interface ProjectSettings extends Dict<ConfigValue>{
    /**
     * id name
     */
    name:string;
    /**
     * display name
     */
    displayName:string;
    
    /**
     * solution settings
     */
    solutionSettings?:SolutionSettings;
}


/**
 * solution settings
 */
export interface SolutionSettings extends Dict<ConfigValue>{
    
    /**
     * solution name
     */
    name:string;

    /**
     * solution display name
     */
    displayName: string;
    
    /**
     * version
     */
    version:string;

    /**
     * active resource plugin names
     */
    resources:string[];

    /**
     * resource settings map,key is resource name, value is resource settings
     */
    resourceSettings: {
        [k:string]:ResourceSettings
    }
}

export type ResourceSettings = Dict<ConfigValue>;


export interface AzureSolutionSettings extends SolutionSettings{
    capabilities:string[],
    hostType?:string,
    azureResources?:string[]
}

/**
 * project dynamic states
 */
export interface ProjectStates extends Dict<ConfigValue>{
    solutionStates:SolutionStates;
}
 
export interface SolutionStates extends Dict<ConfigValue>{
     resourceStates: {
        [k:string]:ResourceStates
    }
}

export type ResourceStates = Dict<ConfigValue>;

export interface Inputs extends Dict<AnswerValue>{
    platform: Platform;
    vscodeEnv?:VsCodeEnv;
}    

export interface Json{
    [k : string]:unknown;
}

/*
 * Context is env independent
 */
export interface Context {
    /**
     * project folder path, not persist
     */
    path: string;

    /**
     * ui interface
     */
    ui: UserInterface;

    /**
     * log util tool
     */
    logProvider: LogProvider;

    /**
     * telemetry tool
     */
    telemetryReporter: TelemetryReporter;

    /**
     * Static settings
     */
    projectSettings: ProjectSettings; 

    /**
     * Dynamic states
     */
    projectStates: ProjectStates;
}
 