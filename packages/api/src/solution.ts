// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Result } from "neverthrow"; 
import { SolutionContext } from "./context";
import { FxError } from "./error";
import { Func, QTreeNode } from "./question";
import { Stage } from "./types";

export interface Solution {
    /**
     * open
     */
    open: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

    /**
     * create
     */
    create: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

    /**
     * update
     */
    update: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

    /**
     * scaffold
     */
    scaffold: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

    /**
     * provision
     */
    provision: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

    /**
     * deploy
     */
    deploy: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

    /**
     * publish
     */
    publish: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

    /**
     * user questions
     */
    getQuestions: (stage: Stage, ctx: SolutionContext) => Promise<Result<QTreeNode | undefined, FxError>>;

    /**
     * local debug
     */
    localDebug: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

    /**
     * expose a func call for dynamic question
     */
    callFunc?: (func: Func, ctx: SolutionContext) => Promise<Result<any, FxError>>;

    /**
     * user questions for customized task
     */
    getQuestionsForUserTask?: (func: Func, ctx: SolutionContext) => Promise<Result<QTreeNode | undefined, FxError>>;

    /**
     * execute customized task
     */
    executeUserTask?: (func: Func, ctx: SolutionContext) => Promise<Result<any, FxError>>;
}
