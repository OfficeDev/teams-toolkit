// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  IBot,
  IComposeExtension,
  IConfigurableTab,
  IStaticTab,
  IWebApplicationInfo,
} from "@microsoft/teams-manifest";
import { Platform, Stage, VsCodeEnv } from "./constants";

/**
 * Definition of option item in single selection or multiple selection
 */
export interface OptionItem {
  /**
   * unique identifier of the option item in the option list
   */
  id: string;
  /**
   * display name
   */
  label: string;
  /**
   * short description
   */
  description?: string;
  /**
   * detailed description
   */
  detail?: string;
  /**
   * customized user data, which is not displayed
   */
  data?: unknown;
  /**
   * @deprecated CLI display name. CLI will use `cliName` as display name, and use `id` instead if `cliName` is undefined.
   */
  cliName?: string;
  /**
   * group name. If it's set, separator will be rendered on UI between groups.
   */
  groupName?: string;

  /**
   * Actions that can be made within the item.
   * @param An array of actions
   * @param `icon` is the icon id of the action item
   * @param `tooltip` is the hint of the action item
   * @param `command` is the command name that will be executed when current action triggered
   */
  buttons?: { iconPath: string; tooltip: string; command: string }[];
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type Void = {};
export const Void = {};
/**
 * environment meta data
 */
export interface EnvMeta {
  name: string;
  local: boolean;
  sideloading: boolean;
}
export interface Inputs extends Record<string, any> {
  platform: Platform;
  projectPath?: string;
  projectId?: string;
  nonInteractive?: boolean;
  correlationId?: string;
  /**
   * whether the caller is triggered by @teams or @office agent
   */
  agent?: "teams" | "office";
  /**
   * Auth info about user selected APIs.
   */
  apiAuthData?: AuthInfo;
}

export type InputsWithProjectPath = Inputs & { projectPath: string };

export type CreateProjectInputs = Inputs & { "app-name": string; folder: string };

// This type has not been supported by TypeScript yet.
// Check here https://github.com/microsoft/TypeScript/issues/13923.
export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

export type MaybePromise<T> = T | Promise<T>;

/**
 * simplified tooling settings for v3
 */
export interface Settings {
  version: string;
  trackingId: string;
}

export type ManifestCapability =
  | {
      name: "staticTab";
      snippet?: IStaticTab;
      existingApp?: boolean;
    }
  | {
      name: "configurableTab";
      snippet?: IConfigurableTab;
      existingApp?: boolean;
    }
  | {
      name: "Bot";
      snippet?: IBot;
      existingApp?: boolean;
    }
  | {
      name: "MessageExtension";
      snippet?: IComposeExtension;
      existingApp?: boolean;
    }
  | {
      name: "WebApplicationInfo";
      snippet?: IWebApplicationInfo;
      existingApp?: boolean;
    };

export enum OpenAIManifestAuthType {
  None = "none",
  UserHttp = "user_http",
  ServiceHttp = "service_http",
  OAuth = "oauth",
}

export interface OpenAIPluginManifest {
  schema_version: string;
  name_for_human: string;
  name_for_model: string;
  description_for_human: string;
  description_for_model: string;
  auth: { type: OpenAIManifestAuthType };
  api: {
    type: string;
    url: string;
  };
  logo_url: string;
  contact_email: string;
  legal_info_url: string;
}

export interface AuthInfo {
  serverUrl: string;
  authName?: string;
  authType?: "apiKey" | "oauth2";
}

export interface ApiOperation {
  id: string;
  label: string;
  groupName: string;
  data: AuthInfo;
  detail?: string;
}

export interface Warning {
  type: string;
  content: string;
  data?: any;
}

export interface CreateProjectResult {
  projectPath: string;
  warnings?: Warning[];
  shouldInvokeTeamsAgent?: boolean;
  projectId?: string;
}

export interface TeamsAppInputs extends InputsWithProjectPath {
  "manifest-file"?: string;
  "package-file"?: string;
  "output-package-file"?: string;
  "output-manifest-file"?: string;
  env?: string;
  "env-file"?: string;
}
