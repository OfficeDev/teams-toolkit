// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
    ConfigMap,
    Core,
    Func,
    FxError,
    ok,
    Platform,
    QTreeNode,
    Result,
    Stage,
    Context,
} from "fx-api";
import { hooks } from "@feathersjs/hooks";
import { concurrentMW } from "./middlewares/concurrent";
import { recoverMW } from "./middlewares/recover";
import { Executor } from "./executor";
import { CoreContext } from "./context";

export class TeamsCore implements Core {
    public static getInstance(): TeamsCore {
        if (!TeamsCore.instance) {
            TeamsCore.instance = new TeamsCore();
        }
        return TeamsCore.instance;
    }

    private static instance: TeamsCore;

    private constructor() {
        console.log("make core singleton");
    }

    @hooks([recoverMW, concurrentMW])
    public async localDebug(
        ctx: Context,
        answers?: ConfigMap,
    ): Promise<Result<null, FxError>> {
        return Executor.localDebug(new CoreContext(ctx), answers);
    }

    @hooks([recoverMW])
    public async getQuestions(
        ctx: Context,
        stage: Stage,
        platform: Platform,
    ): Promise<Result<QTreeNode | undefined, FxError>> {
        return Executor.getQuestions(new CoreContext(ctx), stage, platform);
    }

    @hooks([recoverMW, concurrentMW])
    public async getQuestionsForUserTask(
        ctx: Context,
        func: Func,
        platform: Platform,
    ): Promise<Result<QTreeNode | undefined, FxError>> {
        return Executor.getQuestionsForUserTask(
            new CoreContext(ctx),
            func,
            platform,
        );
    }

    @hooks([recoverMW, concurrentMW])
    public async executeUserTask(
        ctx: Context,
        func: Func,
        answers?: ConfigMap,
    ): Promise<Result<any, FxError>> {
        return Executor.executeUserTask(new CoreContext(ctx), func, answers);
    }

    @hooks([recoverMW])
    public async callFunc(
        ctx: Context,
        func: Func,
        answers?: ConfigMap,
    ): Promise<Result<any, FxError>> {
        return Executor.callFunc(new CoreContext(ctx), func, answers);
    }

    @hooks([recoverMW, concurrentMW])
    public async create(
        ctx: Context,
        answers?: ConfigMap,
    ): Promise<Result<null, FxError>> {
        return Executor.create(new CoreContext(ctx), answers);
    }

    @hooks([recoverMW, concurrentMW])
    public async scaffold(
        ctx: Context,
        answers?: ConfigMap,
    ): Promise<Result<null, FxError>> {
        return Executor.scaffold(new CoreContext(ctx), answers);
    }

    @hooks([recoverMW, concurrentMW])
    public async update(
        ctx: Context,
        answers?: ConfigMap,
    ): Promise<Result<null, FxError>> {
        return Executor.update(new CoreContext(ctx), answers);
    }

    @hooks([recoverMW, concurrentMW])
    public async provision(
        ctx: Context,
        answers?: ConfigMap,
    ): Promise<Result<null, FxError>> {
        return Executor.provision(new CoreContext(ctx), answers);
    }

    @hooks([recoverMW, concurrentMW])
    public async deploy(
        ctx: Context,
        answers?: ConfigMap,
    ): Promise<Result<null, FxError>> {
        return Executor.deploy(new CoreContext(ctx), answers);
    }

    @hooks([recoverMW, concurrentMW])
    public async publish(
        ctx: Context,
        answers?: ConfigMap,
    ): Promise<Result<null, FxError>> {
        return ok(null);
    }

    @hooks([recoverMW, concurrentMW])
    public async createEnv(
        ctx: Context,
        env: string,
    ): Promise<Result<null, FxError>> {
        return Executor.createEnv(new CoreContext(ctx), env);
    }

    @hooks([recoverMW, concurrentMW])
    public async removeEnv(
        ctx: Context,
        env: string,
    ): Promise<Result<null, FxError>> {
        return Executor.removeEnv(new CoreContext(ctx), env);
    }

    @hooks([recoverMW, concurrentMW])
    public async switchEnv(
        ctx: Context,
        env: string,
    ): Promise<Result<null, FxError>> {
        return Executor.switchEnv(new CoreContext(ctx), env);
    }

    @hooks([recoverMW, concurrentMW])
    public async listEnvs(ctx: Context): Promise<Result<string[], FxError>> {
        return Executor.listEnvs(new CoreContext(ctx));
    }
}
