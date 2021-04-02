// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
 

  

// eslint-disable-next-line @typescript-eslint/ban-types
export type Void = {};
export const Void = {};

export interface FunctionRouter{
    namespace?:string,
    method?:string
}
 

export type ConfigValue =
    | string
    | string[]
    | number
    | number[]
    | boolean
    | boolean[]
    | undefined

export  interface Dict<T> {
    [key: string]: T | undefined;
}

export type ResourceTemplate = Dict<ConfigValue>;

export type ResourceTemplates = {
    [k:string]: ResourceTemplate|undefined;
};

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

export type EnvConfig = Dict<string>;


/**
 * project static settings
 */
export interface ProjectSettings{
    solution:Dict<ConfigValue> & {name:string},
    resources: 
    {
        [k:string]: Dict<ConfigValue>
    }
}


/**
 * project dynamic states
 */
export interface ProjectStates
{
    solution:Dict<ConfigValue>,
    resources: 
    {
        [k:string]: Dict<ConfigValue>
    }
}
 