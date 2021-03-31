// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Result } from "neverthrow"; 
import { Task } from "./constants";
import { SolutionContext } from "./context";
import { FxError } from "./error";
import { Func, QTreeNode } from "./question"; 
import { FunctionRouter, Void, SolutionConfig, ReadonlyConfigMap, EnvMap } from "./types";


export interface SolutionPlugin {
    
    shortName:string,

    displayName:string,
 
    /**
     * scaffold a project and return solution config template
     */
    scaffold: (ctx: SolutionContext, scaffoldAnswers: ReadonlyConfigMap) => Promise<Result<SolutionConfig, FxError>>;

    /**
     * update(add resource ), return solution config template
     */
    update: (ctx: SolutionContext, updateAnswers: ReadonlyConfigMap) => Promise<Result<SolutionConfig, FxError>>;

    /**
     * provision
     */
    provision: (ctx: SolutionContext, provisionAnswers: ReadonlyConfigMap) => Promise<Result<EnvMap, FxError>>;

    /**
     * deploy
     */
    deploy: (ctx: SolutionContext, deployAnswers: ReadonlyConfigMap) => Promise<Result<Void, FxError>>;
 
    /**
     * publish
     */
    publish: (ctx: SolutionContext, publishAnswers: ReadonlyConfigMap) => Promise<Result<Void, FxError>>;

    /**
     * get question model for user task in additional to normal lifecycle {@link Task}, for example `Add Resource`, `Add Capabilities`, `Update AAD Permission`, etc
     * `getQuestionsForUserTask` will router the getQuestions request and dispatch from core--->solution--->resource plugin according to `FunctionRouter`.
     */
    getQuestionsForLifecycleTask: (ctx: SolutionContext, task: Task, getQuestionConfig: ReadonlyConfigMap) => Promise<Result<QTreeNode|undefined, FxError>>;

    /**
     * get question model for user task in additional to normal lifecycle {@link Task}, for example `Add Resource`, `Add Capabilities`, `Update AAD Permission`, etc
     * `getQuestionsForUserTask` will router the getQuestions request and dispatch from core--->solution--->resource plugin according to `FunctionRouter`.
     */
    getQuestionsForUserTask?: (ctx: SolutionContext, router: FunctionRouter, getQuestionConfig: ReadonlyConfigMap) => Promise<Result<QTreeNode|undefined, FxError>>;

    /**
     * execute user task in additional to normal lifecycle {@link Task}, for example `Add Resource`, `Add Capabilities`, `Update AAD Permission`, etc
     * `executeUserTask` will router the execute request and dispatch from core--->solution--->resource plugin according to `FunctionRouter`.
     */
    executeUserTask?: (ctx: SolutionContext, func:Func, userTaskAnswers: ReadonlyConfigMap) => Promise<Result<unknown, FxError>>;

    /**
     * There are three scenarios to use this API in question model:
     * 1. answer questions of type `ApiQuestion`. Unlike normal questions, the answer of which is returned by humen input, the answer of `ApiQuestion` is automatically returned by this `executeApiQuestion` call.
     * 2. retrieve dynamic option item list for `SingleSelectQuestion` or `MultiSelectQuestion`. In such a case, the option is defined by `DynamicOption`. When the UI visit such select question, this `executeApiQuestion` will be called to get option list.
     * 3. validation for `TextInputQuestion`, core,solution plugin or resource plugin can define the validation function in `executeApiQuestion`.
     * `executeApiQuestion` will router the execute request from core--->solution--->resource plugin according to `FunctionRouter`.
     */
    executeApiQuestion?: (ctx: SolutionContext, func:Func, answersOfPreviousQuestions: ReadonlyConfigMap) => Promise<Result<unknown, FxError>>;
}
