// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OptionItem } from "./qm";
import { Platform, Stage, VsCodeEnv } from "./constants";

export type Json = Record<string, any>;

export type ConfigValue = any;

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
    if (v instanceof ConfigMap) {
      return v.toJSON() as OptionItem;
    } else {
      return v as OptionItem;
    }
  }
  getOptionItemArray(k: string, defaultValue?: OptionItem[]): OptionItem[] | undefined {
    const v = super.get(k);
    if (!v) return defaultValue;
    return v as OptionItem[];
  }

  toJSON(): Json {
    const out: Json = {};
    for (const entry of super.entries()) {
      if (entry[1] instanceof ConfigMap) {
        out[entry[0]] = entry[1].toJSON();
      } else {
        out[entry[0]] = entry[1];
      }
    }
    return out;
  }

  public static fromJSON(obj?: Json): ConfigMap | undefined {
    if (!obj) return undefined;
    const map = new ConfigMap();
    for (const entry of Object.entries(obj)) {
      if (typeof entry[1] !== "object") {
        map.set(entry[0], entry[1]);
      } else {
        map.set(entry[0], this.fromJSON(entry[1]));
      }
    }
    return map;
  }
  constructor(entries?: readonly (readonly [string, ConfigValue])[] | null) {
    super(entries);
    Object.setPrototypeOf(this, ConfigMap.prototype);
  }
}

export function mergeConfigMap(lhs?: ConfigMap, rhs?: ConfigMap): ConfigMap | undefined {
  if (!lhs) {
    return rhs;
  }
  if (!rhs) {
    return lhs;
  }
  return new ConfigMap([...lhs.entries(), ...rhs.entries()]);
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type Void = {};
export const Void = {};

export type ResourceTemplate = Record<string, ConfigValue>;

export type ResourceTemplates = {
  [k: string]: ResourceTemplate | undefined;
};

export type ResourceConfig = ResourceTemplate;

export type ResourceConfigs = ResourceTemplates;

export type ReadonlyResourceConfig = Readonly<ResourceConfig>;

export type ReadonlyResourceConfigs = Readonly<{
  [k: string]: ReadonlyResourceConfig | undefined;
}>;

/**
 * environment meta data
 */
export interface EnvMeta {
  name: string;
  local: boolean;
  sideloading: boolean;
}

/**
 * project static settings
 */
export interface ProjectSettings {
  appName: string;
  version?: string;
  projectId: string;
  programmingLanguage?: string;
  defaultFunctionName?: string;
  solutionSettings: SolutionSettings;
  isFromSample?: boolean;
  createdFrom?: string;
}

/**
 * solution settings
 */
export interface SolutionSettings extends Json {
  name: string;
  version?: string;
}

export interface AzureSolutionSettings extends SolutionSettings {
  hostType: string;
  capabilities: string[];
  azureResources: string[];
  activeResourcePlugins: string[];
  migrateFromV1?: boolean;
}

/**
 * local debug settings
 */
export interface LocalSettings {
  teamsApp?: ConfigMap;
  auth?: ConfigMap;
  frontend?: ConfigMap;
  backend?: ConfigMap;
  bot?: ConfigMap;
}

/**
 * project dynamic states
 */
export interface ProjectStates {
  solution: Record<string, ConfigValue>;
  resources: {
    [k: string]: Record<string, ConfigValue>;
  };
}
export interface Inputs extends Json {
  projectPath?: string;
  targetEnvName?: string;
  sourceEnvName?: string;
  targetResourceGroupName?: string;
  platform: Platform;
  stage?: Stage;
  vscodeEnv?: VsCodeEnv;
  ignoreLock?: boolean;
  ignoreConfigPersist?: boolean;
  ignoreEnvInfo?: boolean;
  env?: string;
  projectId?: string;
}

export interface ProjectConfig {
  settings?: ProjectSettings;
  config?: SolutionConfig | Json;
  localSettings?: LocalSettings | Json;
}
