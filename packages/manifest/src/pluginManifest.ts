// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export type Instruction = string | string[];
export type Example = string | string[];

export interface PluginManifestSchema {
  schema_version: string;
  name_for_human: string;
  description_for_model?: string;
  description_for_human: string;
  namespace?: string;
  logo_url?: string;
  contact_email?: string;
  legal_info_url?: string;
  privacy_policy_url?: string;
  functions?: FunctionObject[];
  runtimes?: (RuntimeObjectLocalplugin | RuntimeObjectOpenapi)[];
  capabilities?: {
    localization: LocalizationObject;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
export interface FunctionObject {
  name: string;
  description?: string;
  parameters?: FunctionParameters;
  returns?: FunctionReturnType;
  states?: {
    reasoning?: FunctionStateConfig;
    responding?: FunctionStateConfig;
    [k: string]: unknown;
  };
  /**
   * Describes the capabilities of a function, such as confirmations for functions.
   */
  capabilities?: {
    confirmation?: ConfirmationObject;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * A map of parameters for the function.
 */
export interface FunctionParameters {
  /**
   * The type of the function parameters object. Must be 'object'.
   */
  type?: "object";
  /**
   * Map from parameter names to description of parameter requirements.
   */
  properties?: {
    [k: string]: FunctionParameter;
  };
  required?: string[];
  [k: string]: unknown;
}

export interface FunctionParameter {
  /**
   * The type for the parameter. Must be one of: string, array, boolean, integer, number.
   */
  type?: "string" | "array" | "boolean" | "integer" | "number";
  items?: {
    [k: string]: unknown;
  };
  /**
   * An array that specifies the permissible string values for the property.
   */
  enum?: string[];
  /**
   * The description of the parameter.
   */
  description?: string;
  /**
   * The default value of the parameter.
   */
  default?: string | boolean | number | number | unknown[];
  [k: string]: unknown;
}
/**
 * Describes the value of what's returned by the function.
 */
export interface FunctionReturnType {
  /**
   * Type of return value of the function.
   */
  type?: "string" | "array" | "boolean" | "integer" | "number";
  /**
   * Description of the function's return value.
   */
  description?: string;
  [k: string]: unknown;
}
export interface FunctionStateConfig {
  description?: string;
  instructions?: Instruction;
  examples?: Example;
  [k: string]: unknown;
}
export interface ConfirmationObject {
  type?: "None" | "AdaptiveCard";
  title?: string;
  body?: string;
  [k: string]: unknown;
}
export interface RuntimeObjectLocalplugin {
  type: "LocalPlugin";
  run_for_functions?: string[];
  spec: LocalPluginRuntime;
  [k: string]: unknown;
}
export interface LocalPluginRuntime {
  local_endpoint: string;
  [k: string]: unknown;
}
export interface RuntimeObjectOpenapi {
  type: "OpenApi";
  auth?: {
    type?: string;
    [k: string]: unknown;
  };
  run_for_functions?: string[];
  spec: OpenApiRuntime;
  [k: string]: unknown;
}
export interface OpenApiRuntime {
  url: string;
  [k: string]: unknown;
}
export interface LocalizationObject {
  [k: string]: {
    [k: string]: {
      message: string;
      description: string;
      [k: string]: unknown;
    };
  };
}
