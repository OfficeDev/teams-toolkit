// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import {
  EnvMeta,
  FunctionRouter,
  FxError,
  Inputs,
  QTreeNode,
  Stage,
  TokenProvider,
  Void,
  Func,
  Json,
} from "../index";
import { Context } from "./types";

export interface ResourceScaffoldResult {
  provisionTemplate: Json;
  deployTemplate: Json;
}

export interface ResourceProvisionContext extends Context {
  envMeta: EnvMeta;
  
  solutionConfig: Json;
  resourceConfig: Json;
}

export type ResourceDeployContext = ResourceProvisionContext;
 
export interface ResourceConfigureContext extends ResourceProvisionContext {
  deploymentConfigs: Json;
  provisionConfigs: Record<string, Json>;
}

export interface ResourcePublishContext extends Context {
  envMeta: EnvMeta;
  tokenProvider: TokenProvider;
  manifest: Json;
}

export interface ResourceProvisionResult{
  resourceValues: Record<string, string>;
  stateValues: Record<string, string>;
} 

type DeploymentConfig = Json;

/**
 * Interface for ResourcePlugins. a ResourcePlugin can hook into different lifecycles by implementing the corresponding API
 * All lifecycles follows the same pattern of returning a Promise<Result<T, FxError>> for error handling.
 */
export interface ResourcePlugin {

  name: string;
  displayName: string;

  /**
   * scaffold source code on disk
   * @param {Readonly<Context>} ctx - plugin's runtime context
   * @param {Inputs} inputs - 
   * 
   * @return {Result<Void, FxError>} It is returning Void because side effect is expected.
   */
  scaffoldSourceCode?: (ctx: Readonly<Context>,  inputs: Inputs) => Promise<Result<Void, FxError>>;

  scaffoldResourceTemplate?: (ctx: Readonly<Context>,  inputs: Inputs) => Promise<Result<ResourceScaffoldResult, FxError>>;

  provisionResource?: (ctx: Readonly<Context>, tokenProvider: TokenProvider, inputs: Inputs) => Promise<Result<ResourceProvisionResult, FxError>>;

  // Returns a new Deployment config json
  configureResource?: ( ctx: Readonly<ResourceConfigureContext>) => Promise<Result<DeploymentConfig, FxError>>;

  // build code or build a teams app package
  build?: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;

  // Building teams package is now defined as a user task
  package?: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;

  deploy?: (ctx: ResourceDeployContext, inputs: Inputs) => Promise<Result<Void, FxError>>;
  
  publishApplication?: (ctx: ResourcePublishContext, inputs: Inputs) => Promise<Result<Void, FxError>>;

  getQuestionsForLifecycleTask?: (ctx: Context, ask: Stage, inputs: Inputs) => Promise<Result<QTreeNode | undefined, FxError>>;

  getQuestionsForUserTask?: (ctx: Context, router: FunctionRouter, inputs: Inputs) => Promise<Result<QTreeNode | undefined, FxError>>;

  // Building teams package is now defined as a user task
  executeUserTask?: (ctx: Context, func: Func, inputs: Inputs) => Promise<Result<unknown, FxError>>;
}