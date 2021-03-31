// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
  
import { Result } from "neverthrow";
import { Task } from "./constants";
import { ResourceContext } from "./context";
import { FxError } from "./error";
import { Func, QTreeNode } from "./question";  
import { FunctionRouter, ReadonlySolutionConfig, Void, ResourceConfig, ReadonlyConfigMap, EnvMap } from "./types";
import { TokenProvider } from "./utils";

export type LocalDebugContext = ResourceContext & { tokenProvider: TokenProvider };
export type ProvisionContext = ResourceContext & { tokenProvider: TokenProvider };
export type DeployContext = ResourceContext & { tokenProvider: TokenProvider };
export type ScaffoldContext = ResourceContext;

 
/**
 * Plugin lifecycle interface. Generally we encourage functional error handling by using Result<T, FxError>.
 * In every lifecyle, you have access common utilities via {@link ResourceContext}, e.g. telemery, logging, config.
 * Configs are guaranteed to be persisted after each lifecycle returns.
 *
 * Special lifecycles include localDebug, provision and deploy, which may require authenticated access to Azure/Graph API/AppStudio.
 * Related access token are provided in ctx.tokenProvider.
 *
 */
export interface ResourcePlugin {

    shortName:string,

    displayName:string,

    /**
     * scaffold source code on disk
     */
    scaffoldCode?: (ctx: ScaffoldContext, userAnswersForScaffold: ReadonlyConfigMap) => Promise<Result<Void, FxError>>;  

    /**
     * scaffold a memory version of config template
     */
    scaffoldConfigForProvision?: (ctx: ScaffoldContext, userAnswersForScaffold: ReadonlyConfigMap) => Promise<Result<ResourceConfig, FxError>>; 
    
    /**
     * Provisons the resource owned by this plugin. Answers to questions before provision collected by getQuestions will be available in ctx.
     * A plugin can call azure/graph/teams appstudio RESTful api using the respective token in ctx.tokenProvider.
     * Provision of all plugins will run concurrently.
     */
    provision?: (ctx: ProvisionContext, userAnswerForProvision: ReadonlyConfigMap) => Promise<Result<EnvMap, FxError>>;

    /**
     * Configures provisioned resources. You can read the config values of your interest from configOfOtherPlugins, and change
     * your own in ctx.config.
     */
    configureProvisionedResources?: (ctx: ResourceContext, configOfOtherResources: ReadonlySolutionConfig) => Promise<Result<Void, FxError>>;

    /**
     * deploy resource
     */
    deploy?: (ctx: DeployContext, userAnswersForDeploy: ReadonlyConfigMap) => Promise<Result<Void, FxError>>;

    /**
     * publish app
     */
    publish?: (ctx: ResourceContext, userAnsersForPublish: ReadonlyConfigMap) => Promise<Result<Void, FxError>>;
    
    /**
     * Declare what user input you need for each {@link task}. Questions are organized as a tree. Please check {@link QTreeNode}.
     *
     */
    getQuestionsForLifecycleTask?: (ctx: ResourceContext, task: Task, userAnswers: ReadonlyConfigMap) => Promise<Result<QTreeNode|undefined, FxError>>;

    /**
     * get question model for lifecycle {@link Task} (create, provision, deploy, debug, publish), Questions are organized as a tree. Please check {@link QTreeNode}.
     */
    getQuestionsForUserTask?: (ctx: ResourceContext, router: FunctionRouter, userAnswers: ReadonlyConfigMap) => Promise<Result<QTreeNode | undefined, FxError>>;

    /**
     * execute user task in additional to normal lifecycle {@link Task}, for example `Add Resource`, `Add Capabilities`, `Update AAD Permission`, etc
     * `executeUserTask` will router the execute request and dispatch from core--->solution--->resource plugin according to `FunctionRouter`.
     */
    executeUserTask?: (ctx: ResourceContext, func:Func, userAnswers: ReadonlyConfigMap) => Promise<Result<unknown, FxError>>;
    
    /**
     * There are three scenarios to use this API in question model:
     * 1. answer questions of type `ApiQuestion`. Unlike normal questions, the answer of which is returned by humen input, the answer of `ApiQuestion` is automatically returned by this `executeApiQuestion` call.
     * 2. retrieve dynamic option item list for `SingleSelectQuestion` or `MultiSelectQuestion`. In such a case, the option is defined by `DynamicOption`. When the UI visit such select question, this `executeApiQuestion` will be called to get option list.
     * 3. validation for `TextInputQuestion`, core,solution plugin or resource plugin can define the validation function in `executeApiQuestion`.
     * `executeApiQuestion` will router the execute request from core--->solution--->resource plugin according to `FunctionRouter`.
     */
     executeApiQuestion?: (ctx: ResourceContext, func:Func, answersOfPreviousQuestions: ReadonlyConfigMap) => Promise<Result<unknown, FxError>>;
}
