// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OptionItem } from "./question";
import { Json } from "./types";

export type ConfigValue =
    | string
    | string[]
    | number
    | number[]
    | boolean
    | boolean[]
    | OptionItem[]
    | OptionItem
    | undefined;

export type PluginIdentity = string;

export type PluginConfig = ConfigMap;
export type ReadonlyPluginConfig = ReadonlyMap<string, ConfigValue>;

export type SolutionConfig = Map<PluginIdentity, PluginConfig>;
export type ReadonlySolutionConfig = ReadonlyMap<PluginIdentity, ReadonlyPluginConfig>;

export class ConfigMap extends Map<string, ConfigValue> {
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

    toJSON(): Json {
        const out: Json = {};
        for (const entry of super.entries()) {
            out[entry[0]] = entry[1];
        }
        return out;
    }

    public static fromJSON(obj?: Json): ConfigMap | undefined {
        if (!obj) return undefined;
        const map = new ConfigMap();
        for (const entry of Object.entries(obj)) {
            map.set(entry[0], entry[1]);
        }
        return map;
    }
}

// let map = new ConfigMap();
// map.set('a', {label:'sfs', description:'desr'});
// map.set('b', 1234);
// map.set('c', true);
// map.set('d', [{label:'sfs1', description:'desr1'}, {label:'sfs2', description:'desr2'}]);
// map.set('e', [1,2,3,4]);
// map.set('f', undefined);
// let obj = map.toJSON();
// console.log(JSON.stringify(obj));

// let map2 = ConfigMap.fromJSON(obj);
// console.log(map2);
// let obj2 = map2?.toJSON();
// console.log(JSON.stringify(obj2));

// console.log(ConfigMap.fromJSON());
