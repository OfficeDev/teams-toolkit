// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Result } from "neverthrow"; 
import { Task } from "./constants"; 
import { FxError } from "./error";
import { Func, QTreeNode, ReadonlyUserInputs } from "./qm/question"; 
import { EnvConfig, EnvMeta, FunctionRouter, ResourceConfigs, ResourceTemplates, Void } from "./config";
import { Context } from "./context";
import { TokenProvider } from "./utils";


export interface SolutionProvisionContext  extends Context {

    /**
     * environment data
     */
    envMeta: EnvMeta;

    /**
     * token provider
     */
    tokenProvider: TokenProvider;   

    /**
     * all resource configs, placeholders are replaced by env
     */
    resourceConfigs: ResourceConfigs;
}

export interface SolutionPlugin {
    
    shortName:string,

    displayName:string,
 
    /**
     * scaffold a project and return solution config template
     */
    scaffold: (ctx: Context, userInputs: ReadonlyUserInputs) => Promise<Result<ResourceTemplates, FxError>>;

    /**
     * update(add resource), return solution config template
     */
    update: (ctx: Context, userInputs: ReadonlyUserInputs) => Promise<Result<ResourceTemplates, FxError>>;

    /**
     * provision
     */
    provision: (ctx: SolutionProvisionContext, userInputs: ReadonlyUserInputs) => Promise<Result<EnvConfig, FxError>>;

    /**
     * build
     */
    build: (ctx: Context, userInputs: ReadonlyUserInputs) => Promise<Result<Void, FxError>>;

    /**
     * deploy
     */
    deploy: (ctx: SolutionProvisionContext, userInputs: ReadonlyUserInputs) => Promise<Result<Void, FxError>>;
 
    /**
     * publish
     */
    publish: (ctx: SolutionProvisionContext, userInputs: ReadonlyUserInputs) => Promise<Result<Void, FxError>>;

    /**
     * get question model for user task in additional to normal lifecycle {@link Task}, for example `Add Resource`, `Add Capabilities`, `Update AAD Permission`, etc
     * `getQuestionsForUserTask` will router the getQuestions request and dispatch from core--->solution--->resource plugin according to `FunctionRouter`.
     */
    getQuestionsForLifecycleTask: (task: Task, userInputs: ReadonlyUserInputs, ctx?: Context) => Promise<Result<QTreeNode|undefined, FxError>>;

    /**
     * get question model for user task in additional to normal lifecycle {@link Task}, for example `Add Resource`, `Add Capabilities`, `Update AAD Permission`, etc
     * `getQuestionsForUserTask` will router the getQuestions request and dispatch from core--->solution--->resource plugin according to `FunctionRouter`.
     */
    getQuestionsForUserTask?: (router: FunctionRouter, userInputs: ReadonlyUserInputs, ctx?: Context) => Promise<Result<QTreeNode|undefined, FxError>>;

    /**
     * execute user task in additional to normal lifecycle {@link Task}, for example `Add Resource`, `Add Capabilities`, `Update AAD Permission`, etc
     * `executeUserTask` will router the execute request and dispatch from core--->solution--->resource plugin according to `FunctionRouter`.
     */
    executeUserTask?: (func:Func, userInputs: ReadonlyUserInputs, ctx?: Context) => Promise<Result<unknown, FxError>>;

    /**
     * There are three scenarios to use this API in question model:
     * 1. answer questions of type `ApiQuestion`. Unlike normal questions, the answer of which is returned by humen input, the answer of `ApiQuestion` is automatically returned by this `executeApiQuestion` call.
     * 2. retrieve dynamic option item list for `SingleSelectQuestion` or `MultiSelectQuestion`. In such a case, the option is defined by `DynamicOption`. When the UI visit such select question, this `executeApiQuestion` will be called to get option list.
     * 3. validation for `TextInputQuestion`, core,solution plugin or resource plugin can define the validation function in `executeApiQuestion`.
     * `executeFuncQuestion` will router the execute request from core--->solution--->resource plugin according to `FunctionRouter`.
     */
     executeFuncQuestion?: (func:Func, previousAnswers: ReadonlyUserInputs, ctx?: Context) => Promise<Result<unknown, FxError>>;
}
