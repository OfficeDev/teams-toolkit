// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Result } from "neverthrow";  
import { EnvMeta, FunctionRouter, FxError, Inputs, QTreeNode, Stage, TokenProvider, Func, Json, Void } from "../index";
import { Context } from "./types";

 
export interface SolutionProvisionContext extends Context {
    env: EnvMeta;
    tokenProvider: TokenProvider;
    resourceConfigs: Record<string, Json>;
}

export type SolutionDeployContext = SolutionProvisionContext;
 
export interface SolutionScaffoldResult{
  provisionTemplates:Record<string, Json>;
  deployTemplates: Record<string, Json>;
}
 
export interface SolutionPublishContext extends Context {
    env: EnvMeta;
    tokenProvider: TokenProvider;
    provisionConfigs?: Record<string, Json>;
    deployConfigs?: Record<string, Json>;
}


export interface SolutionProvisionResult{
  resourceValues: Record<string, string>;
  stateValues: Record<string, string>;
}
 

export interface SolutionPlugin {
    
    name:string,
    
    displayName:string,
 
    scaffoldFiles: (ctx: Context, inputs: Inputs) => Promise<Result<SolutionScaffoldResult, FxError>>;
 
    buildArtifacts: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;
 
    provisionResources: (ctx: SolutionProvisionContext, inputs: Inputs) => Promise<Result<SolutionProvisionResult, FxError>>;
 
    deployArtifacts: (ctx: SolutionDeployContext, inputs: Inputs) => Promise<Result<Void, FxError>>;
  
    publishApplication: (ctx: SolutionPublishContext, inputs: Inputs) => Promise<Result<Void, FxError>>;
    
    /**
     * get question model for lifecycle {@link Stage} (create, provision, deploy, publish), Questions are organized as a tree. Please check {@link QTreeNode}.
     */
    getQuestionsForLifecycleTask: (task: Stage, inputs: Inputs, ctx?: Context) => Promise<Result<QTreeNode|undefined, FxError>>;

    /**
     * get question model for plugin customized {@link Task}, Questions are organized as a tree. Please check {@link QTreeNode}.
     */
    getQuestionsForUserTask?: (router: FunctionRouter, inputs: Inputs, ctx?: Context) => Promise<Result<QTreeNode|undefined, FxError>>;
    /**
     * execute user customized task, for example `Add Resource`, `Add Capabilities`, etc
     */
    executeUserTask?: (func:Func, inputs: Inputs, ctx?: Context) => Promise<Result<unknown, FxError>>;
}