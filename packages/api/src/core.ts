// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

/*
 *  ------------
 * |  extension | -- UI & dialog & telemetry & logger
 *  ------------
 *
 *  ------------
 * |    core    | -- Environments & Project
 *  ------------
 *
 *  ------------------
 * |  solution plugin | -- General lifecycle
 *  -------------------
 *
 *  ----------------------
 * |   resource plugin   | -- Specific lifecycle
 *  ----------------------
 */
 
import { Result } from "neverthrow";  
import { EnvMeta, Func, FunctionRouter, FxError, Inputs, QTreeNode, Task, Void } from "./index";

export interface Core {

    /**
     * create a project, return the project path
     * Core module will not open the created project, extension will do this
     */
    create: (userInputs: Inputs) => Promise<Result<string, FxError>>;

    /**
     * provision resource to cloud
     */
    provision: (userInputs: Inputs) => Promise<Result<Void, FxError>>;

    /**
     * build artifacts
     */
    build: (userInputs: Inputs) => Promise<Result<Void, FxError>>;

    /**
     * deploy resource to cloud
     */
    deploy: (userInputs: Inputs) => Promise<Result<Void, FxError>>;

    /**
     * publish app
     */
    publish: (userInputs: Inputs) => Promise<Result<Void, FxError>>;

    /**
     * create an environment
     */
    createEnv: (env: EnvMeta) => Promise<Result<Void, FxError>>;

    /**
     * remove an environment
     */
    removeEnv: (env: string) => Promise<Result<Void, FxError>>;

    /**
     * switch environment
     */
    switchEnv: (env: string) => Promise<Result<Void, FxError>>;

    /**
     * switch environment
     */
    listEnvs: () => Promise<Result<EnvMeta[], FxError>>;

    /**
     * get question model for lifecycle {@link Task} (create, provision, deploy, debug, publish), Questions are organized as a tree. Please check {@link QTreeNode}.
     */
    getQuestionsForLifecycleTask: (task:Task, userInputs: Inputs) => Promise<Result<QTreeNode | undefined, FxError>>;

    /**
     * get question model for user task in additional to normal lifecycle {@link Task}, for example `Add Resource`, `Add Capabilities`, `Update AAD Permission`, etc
     * `getQuestionsForUserTask` will router the getQuestions request and dispatch from core--->solution--->resource plugin according to `FunctionRouter`.
     */
    getQuestionsForUserTask: (router:FunctionRouter, userInputs: Inputs) => Promise<Result<QTreeNode | undefined, FxError>>;
     
    /**
     * execute user task in additional to normal lifecycle {@link Task}, for example `Add Resource`, `Add Capabilities`, `Update AAD Permission`, etc
     * `executeUserTask` will router the execute request and dispatch from core--->solution--->resource plugin according to `FunctionRouter`.
     * pre local debug check is another application of `executeUserTask`, it will call `provision` locally and `deploy` locally to launch local servers.
     */
    executeUserTask: (func:Func, userInputs: Inputs) => Promise<Result<unknown, FxError>>;
    
    /**
     * There are three scenarios to use this API in question model:
     * 1. answer questions of type `FuncQuestion`. Unlike normal questions, the answer of which is returned by humen input, the answer of `FuncQuestion` is automatically returned by this `executeFuncQuestion` call.
     * 2. retrieve dynamic option item list for `SingleSelectQuestion` or `MultiSelectQuestion`. In such a case, the option is defined by `DynamicOption`. When the UI visit such select question, this `executeFuncQuestion` will be called to get option list.
     * 3. validation for `TextInputQuestion`, core,solution plugin or resource plugin can define the validation function in `executeFuncQuestion`.
     * `executeFuncQuestion` will router the execute request from core--->solution--->resource plugin according to `FunctionRouter`.
     */
    executeFuncQuestion: (func:Func, previousAnswers: Inputs) => Promise<Result<unknown, FxError>>; 
}
