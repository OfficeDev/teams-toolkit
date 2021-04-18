// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Result } from "neverthrow";  
import { Context, SolutionSettings, SolutionStates,VariableDict, EnvMeta, Func, FunctionRouter, FxError, Inputs, QTreeNode, ResourceConfigs, ResourceTemplates, Task, TokenProvider, Void } from "./index";



export interface SolutionContext extends Context{
    solutionSettings?: SolutionSettings;
    solutionStates?: SolutionStates;
}


export interface SolutionEnvContext  extends SolutionContext {
    /**
     * environment data
     */
    env: EnvMeta;

    /**
     * token provider
     */
    tokenProvider: TokenProvider;

    /**
     * this config can be provision config or deploy config
     */
    resourceConfigs: ResourceConfigs;
}

export interface SolutionAllContext extends SolutionContext {

    envMeta: EnvMeta;

    tokenProvider: TokenProvider;

    provisionConfigs?: ResourceConfigs;

    deployConfigs?: ResourceConfigs;
}

export interface SolutionPlugin {
    
    name:string,
    displayName:string,

 
    /**
     * scaffold a project and return solution config template
     */
    scaffold: (ctx: SolutionContext, inputs: Inputs) => Promise<Result<{provisionTemplates:ResourceTemplates, deployTemplates: ResourceTemplates}, FxError>>;

    /**
     * build
     */
    build: (ctx: SolutionContext, inputs: Inputs) => Promise<Result<Void, FxError>>;

    /**
     * provision
     */
    provision: (ctx: SolutionEnvContext, inputs: Inputs) => Promise<Result<VariableDict, FxError>>;

    
    /**
     * deploy
     */
    deploy: (ctx: SolutionEnvContext, inputs: Inputs) => Promise<Result<VariableDict, FxError>>;
 
    /**
     * publish
     */
    publish: (ctx: SolutionEnvContext, inputs: Inputs) => Promise<Result<Void, FxError>>;

    /**
     * get question model for user task in additional to normal lifecycle {@link Task}, for example `Add Resource`, `Add Capabilities`, `Update AAD Permission`, etc
     * `getQuestionsForUserTask` will router the getQuestions request and dispatch from core--->solution--->resource plugin according to `FunctionRouter`.
     */
    getQuestionsForLifecycleTask: (ctx: SolutionAllContext, task: Task, inputs: Inputs) => Promise<Result<QTreeNode|undefined, FxError>>;

    /**
     * get question model for user task in additional to normal lifecycle {@link Task}, for example `Add Resource`, `Add Capabilities`, `Update AAD Permission`, etc
     * `getQuestionsForUserTask` will router the getQuestions request and dispatch from core--->solution--->resource plugin according to `FunctionRouter`.
     */
    getQuestionsForUserTask?: (ctx: SolutionAllContext, router: FunctionRouter, inputs: Inputs) => Promise<Result<QTreeNode|undefined, FxError>>;

    /**
     * execute user task in additional to normal lifecycle {@link Task}, for example `Add Resource`, `Add Capabilities`, `Update AAD Permission`, etc
     * `executeUserTask` will router the execute request and dispatch from core--->solution--->resource plugin according to `FunctionRouter`.
     */
    executeUserTask?: (ctx: SolutionAllContext, func:Func, inputs: Inputs) => Promise<Result<unknown, FxError>>;

    /**
     * There are three scenarios to use this API in question model:
     * 1. answer questions of type `FuncQuestion`. Unlike normal questions, the answer of which is returned by humen input, the answer of `FuncQuestion` is automatically returned by this `executeFuncQuestion` call.
     * 2. retrieve dynamic option item list for `SingleSelectQuestion` or `MultiSelectQuestion`. In such a case, the option is defined by `DynamicOption`. When the UI visit such select question, this `executeFuncQuestion` will be called to get option list.
     * 3. validation for `TextInputQuestion`, core,solution plugin or resource plugin can define the validation function in `executeFuncQuestion`.
     * `executeQuestionFlowFunction` will router the execute request from core--->solution--->resource plugin according to `FunctionRouter`.
     */
     executeQuestionFlowFunction?: (ctx: SolutionAllContext, func:Func, previousAnswers: Inputs) => Promise<Result<unknown, FxError>>;
}
