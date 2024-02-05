// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export interface IRenderingTemplate {
  /**
   * Url of the adaptive card template.
   */
  template_url: string;
  /**
   * Operation id.
   */
  operationId: string;
}

export interface ICapability {
  /**
   * Adaptive card describes how a function response can be rendered.
   */
  rendering_templates?: { [k: string]: IRenderingTemplate };
}

export interface IFunction {
  /**
   * Name which uniquely identifies the function.
   */
  name: string;
  /**
   * Description.
   */
  description: string;
  /**
   * A collection of data used to configure optional capabilities of the orchestrator while invoking the function
   */
  capabilities?: ICapability;
}

export interface ISpec {
  /**
   * Local runtime identifier that links to a specific function
   */
  local_endpoint?: string;
  /**
   * Url of the OpenAPI spec.
   */
  url?: string;
}

export interface IAuth {
  type: string;
}

export interface IRuntime {
  type: "openApi" | "localPlugin";
  auth: IAuth;
  run_for_functions?: string[];
  spec: ISpec;
}

export interface PluginBManifest {
  /**
   * The schema version of the manifest
   */
  schema_version: string;
  /**
   * Human-readable name for the plugin
   */
  name_for_human: string;
  /**
   * Description for the plugin.
   */
  description_for_model: string;
  /**
   * Human-readable description for the plugin.
   */
  description_for_human: string;
  /**
   * URL used to fetach the logo.
   */
  logo_url: string;
  /**
   * An emaill address of a contact.
   */
  contact_email: string;
  /**
   * An absolute URL that locates a document containing the legal information.
   */
  legal_info_url: string;
  /**
   * A JSON array that contains an set of function objects
   */
  functions?: IFunction[];
  /**
   * A JSON array that contains an set of runtime objects
   */
  runtimes?: IRuntime[];
}
