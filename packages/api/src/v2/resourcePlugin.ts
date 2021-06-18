// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import {
  Context,
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

export interface ResourceScaffoldResult {
  provisionTemplate: Json;
  deployTemplate: Json;
}

export interface ResourceProvisionContext extends Context {
  envMeta: EnvMeta;
  tokenProvider: TokenProvider;
  solutionConfig: Json;
  resourceConfig: Json;
}

export type ResourceDeployContext = ResourceProvisionContext;
 
export interface ResourceConfigureContext extends ResourceProvisionContext {
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

export interface ResourcePlugin {

  name: string;
  displayName: string;

  scaffoldSourceCode?: ( ctx: Context,  inputs: Inputs ) => Promise<Result<Void, FxError>>;

  scaffoldResourceTemplate?: ( ctx: Context,  inputs: Inputs ) => Promise<Result<ResourceScaffoldResult, FxError>>;

  provisionResource?: ( ctx: ResourceProvisionContext, inputs: Inputs ) => Promise<Result<ResourceProvisionResult, FxError>>;

  configureResource?: ( ctx: ResourceConfigureContext ) => Promise<Result<Void, FxError>>;

  buildArtifacts?: ( ctx: Context, inputs: Inputs ) => Promise<Result<Void, FxError>>;

  deployArtifacts?: ( ctx: ResourceDeployContext, inputs: Inputs ) => Promise<Result<Void, FxError>>;

  publishApplication?: ( ctx: ResourcePublishContext,  inputs: Inputs ) => Promise<Result<Void, FxError>>;

  getQuestionsForLifecycleTask?: (ask: Stage, inputs: Inputs,  ctx: Context ) => Promise<Result<QTreeNode | undefined, FxError>>;

  getQuestionsForUserTask?: ( router: FunctionRouter, inputs: Inputs, ctx: Context) => Promise<Result<QTreeNode | undefined, FxError>>;

  executeUserTask?: ( func: Func, inputs: Inputs,  ctx: Context ) => Promise<Result<unknown, FxError>>;
}