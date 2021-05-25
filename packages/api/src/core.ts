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
import {
    LogProvider,
    TelemetryReporter,
    AzureAccountProvider,
    GraphTokenProvider,
    AppStudioTokenProvider,
    Dialog,
    TreeProvider
} from "./utils";
import { Result } from "neverthrow";
import { ConfigMap } from "./config";
import { Func, QTreeNode, UserInteraction } from "./qm";
import { Platform, Stage } from "./constants";
import { FxError } from "./error";

export interface Core {
    /**
     * init
     */
    init: (globalConfig?: ConfigMap) => Promise<Result<null, FxError>>;

    /**
     * declare all the user questions
     */
    getQuestions?: (stage: Stage, platform: Platform) => Promise<Result<QTreeNode | undefined, FxError>>;

    /**
     * withDialog
     */
    withDialog: (dialog: Dialog, ui?: UserInteraction) => Promise<Result<null, FxError>>;

    /**
     * withLogger
     */
    withLogger: (logger: LogProvider) => Promise<Result<null, FxError>>;

    /**
     * withAzureAccount
     */
    withAzureAccount: (azureAccount: AzureAccountProvider) => Promise<Result<null, FxError>>;

    /**
     * withGraphToken
     */
    withGraphToken: (graphToken: GraphTokenProvider) => Promise<Result<null, FxError>>;

    /**
     * withAppStudioToken
     */
    withAppStudioToken: (appStudioToken: AppStudioTokenProvider) => Promise<Result<null, FxError>>;

    /**
     * withTelemetry
     */
    withTelemetry: (logger: TelemetryReporter) => Promise<Result<null, FxError>>;

    /**
     * withTreeProvider
     */
    withTreeProvider: (treeProvider: TreeProvider) => Promise<Result<null, FxError>>;

    /**
     * create a project
     */
    create: (answers?: ConfigMap) => Promise<Result<null, FxError>>;

    /**
     * update existing project
     */
    update: (answers?: ConfigMap) => Promise<Result<null, FxError>>;

    /**
     * open an existing project
     */
    open: (workspace?: string) => Promise<Result<null, FxError>>;

    /**
     * scaffold
     */
    scaffold: (answers?: ConfigMap) => Promise<Result<null, FxError>>;

    /**
     * local debug
     */
    localDebug: (answers?: ConfigMap) => Promise<Result<null, FxError>>;

    /**
     * provision
     */
    provision: (answers?: ConfigMap) => Promise<Result<null, FxError>>;

    /**
     * deploy
     */
    deploy: (answers?: ConfigMap) => Promise<Result<null, FxError>>;

    /**
     * publish app
     */
    publish: (answers?: ConfigMap) => Promise<Result<null, FxError>>;

    /**
     * create an environment
     */
    createEnv: (env: string) => Promise<Result<null, FxError>>;

    /**
     * remove an environment
     */
    removeEnv: (env: string) => Promise<Result<null, FxError>>;

    /**
     * switch environment
     */
    switchEnv: (env: string) => Promise<Result<null, FxError>>;

    /**
     * switch environment
     */
    listEnvs: () => Promise<Result<string[], FxError>>;

    /**
     * callFunc for question flow
     */
    callFunc?: (func: Func, answer?: ConfigMap) => Promise<Result<any, FxError>>;

    /**
     * user questions for customized task
     */
    getQuestionsForUserTask?: (func: Func, platform: Platform) => Promise<Result<QTreeNode | undefined, FxError>>;

    /**
     * execute user customized task in additional to normal lifecycle APIs.
     */
    executeUserTask?: (func: Func, answer?: ConfigMap) => Promise<Result<any, FxError>>;
}
