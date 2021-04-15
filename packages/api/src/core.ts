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
 *  ------------
 * |  solution  | -- General lifecycle
 *  ------------
 *
 *  ------------
 * |   plugin   | -- Specific lifecycle
 *  ------------
 */
import { Result } from "neverthrow";
import { ConfigMap } from "./config";
import { Func, QTreeNode } from "./qm";
import { FxError } from "./error";
import { Context } from "./context";

export interface Core {
    /**
     * declare all the user questions
     */
    getQuestions?: (
        ctx: Context,
    ) => Promise<Result<QTreeNode | undefined, FxError>>;

    /**
     * create a project
     */
    create: (
        ctx: Context,
        answers?: ConfigMap,
    ) => Promise<Result<string, FxError>>;

    /**
     * update existing project
     */
    update: (
        ctx: Context,
        answers?: ConfigMap,
    ) => Promise<Result<null, FxError>>;

    /**
     * scaffold
     */
    scaffold: (
        ctx: Context,
        answers?: ConfigMap,
    ) => Promise<Result<null, FxError>>;

    /**
     * local debug
     */
    localDebug: (
        ctx: Context,
        answers?: ConfigMap,
    ) => Promise<Result<null, FxError>>;

    /**
     * provision
     */
    provision: (
        ctx: Context,
        answers?: ConfigMap,
    ) => Promise<Result<null, FxError>>;

    /**
     * deploy
     */
    deploy: (
        ctx: Context,
        answers?: ConfigMap,
    ) => Promise<Result<null, FxError>>;

    /**
     * publish app
     */
    publish: (
        ctx: Context,
        answers?: ConfigMap,
    ) => Promise<Result<null, FxError>>;

    /**
     * create an environment
     */
    createEnv: (ctx: Context, env: string) => Promise<Result<null, FxError>>;

    /**
     * remove an environment
     */
    removeEnv: (ctx: Context, env: string) => Promise<Result<null, FxError>>;

    /**
     * switch environment
     */
    switchEnv: (ctx: Context, env: string) => Promise<Result<null, FxError>>;

    /**
     * switch environment
     */
    listEnvs: (ctx: Context) => Promise<Result<string[], FxError>>;

    /**
     * callFunc for question flow
     */
    callFunc?: (
        ctx: Context,
        func: Func,
        answer?: ConfigMap,
    ) => Promise<Result<any, FxError>>;

    /**
     * user questions for customized task
     */
    getQuestionsForUserTask?: (
        ctx: Context,
        func: Func,
    ) => Promise<Result<QTreeNode | undefined, FxError>>;

    /**
     * execute user customized task in additional to normal lifecycle APIs.
     */
    executeUserTask?: (
        ctx: Context,
        func: Func,
        answer?: ConfigMap,
    ) => Promise<Result<any, FxError>>;
}
