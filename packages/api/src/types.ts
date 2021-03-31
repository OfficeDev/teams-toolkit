// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OptionItem } from "./question";

export interface Json {
    [k: string]: unknown;
}

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
    | OptionItem[]
    | OptionItem
    | undefined

export type PluginIdentity = string;

export type ResourceConfig = ConfigMap;// ConfigMap | Json??
export type ReadonlyResourceConfig = ReadonlyConfigMap;
export type SolutionConfig = Map<PluginIdentity, ResourceConfig>;
export type ReadonlySolutionConfig = ReadonlyMap<PluginIdentity, ReadonlyResourceConfig>;

export interface Env{
    name:string,
    isLocal:boolean,
    isSideloading:boolean
}

export class EnvMap extends Map<string, string> {
    constructor()
    {
        super();
        Object.setPrototypeOf(this, EnvMap.prototype);
    }
}

export class ConfigMap extends Map<string, ConfigValue> {
    constructor()
    {
        super();
        Object.setPrototypeOf(this, ConfigMap.prototype);
    }
    getString(k: string, defaultValue?: string): string | undefined {
        const v = super.get(k);
        if (!v) return defaultValue;
        return String(v);
    }
    getBoolean(k: string, defaultValue?: boolean): boolean | undefined {
        const v = super.get(k);
        if (!v) return defaultValue;
        return Boolean(v);
    }
    getNumber(k: string, defaultValue?: number): number | undefined {
        const v = super.get(k);
        if (!v) return defaultValue;
        return Number(v);
    }
    getStringArray(k: string, defaultValue?: string[]): string[] | undefined {
        const v = super.get(k);
        if (!v) return defaultValue;
        return v as string[];
    }
    getNumberArray(k: string, defaultValue?: number[]): number[] | undefined {
        const v = super.get(k);
        if (!v) return defaultValue;
        return v as number[];
    }
    getBooleanArray(k: string, defaultValue?: boolean[]): boolean[] | undefined {
        const v = super.get(k);
        if (!v) return defaultValue;
        return v as boolean[];
    }
    getOptionItem(k: string, defaultValue?: OptionItem): OptionItem | undefined {
        const v = super.get(k);
        if (!v) return defaultValue;
        return v as OptionItem;
    }
    getOptionItemArray(k: string, defaultValue?: OptionItem[]): OptionItem[] | undefined {
        const v = super.get(k);
        if (!v) return defaultValue;
        return v as OptionItem[];
    }

    toJson(): Json {
        const out: Json = {};
        for (const entry of super.entries()) {
            out[entry[0]] = entry[1];
        }
        return out;
    }

    public static fromJson(obj?: Json): ConfigMap | undefined {
        if (!obj) return undefined;
        const map = new ConfigMap();
        for (const entry of Object.entries(obj)) {
            map.set(entry[0], entry[1] as ConfigValue);
        }
        return map;
    }
}
 

export interface ReadonlyConfigMap extends ReadonlyMap<string, ConfigValue> {
    getString(k: string, defaultValue?: string): string | undefined ;
    getBoolean(k: string, defaultValue?: boolean): boolean | undefined ;
    getNumber(k: string, defaultValue?: number): number | undefined;
    getStringArray(k: string, defaultValue?: string[]): string[] | undefined ;
    getNumberArray(k: string, defaultValue?: number[]): number[] | undefined ;
    getBooleanArray(k: string, defaultValue?: boolean[]): boolean[] | undefined;
    getOptionItem(k: string, defaultValue?: OptionItem): OptionItem | undefined;
    getOptionItemArray(k: string, defaultValue?: OptionItem[]): OptionItem[] | undefined;
    toJSON(): Json;
}


