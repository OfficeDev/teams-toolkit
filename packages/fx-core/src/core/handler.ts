// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  ConfigMap,
  Core,
  Func,
  FxError,
  ok,
  QTreeNode,
  Result,
  Context,
  err,
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
    answers?: ConfigMap
  ): Promise<Result<null, FxError>> {
    return await Executor.localDebug(new CoreContext(ctx), answers);
  }

  @hooks([recoverMW])
  public async getQuestions(
    ctx: Context
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await Executor.getQuestions(new CoreContext(ctx));
  }

  @hooks([recoverMW])
  public async getQuestionsForUserTask(
    ctx: Context,
    func: Func
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await Executor.getQuestionsForUserTask(new CoreContext(ctx), func);
  }

  @hooks([recoverMW])
  public async executeUserTask(
    ctx: Context,
    func: Func,
    answers?: ConfigMap
  ): Promise<Result<any, FxError>> {
    return await Executor.executeUserTask(new CoreContext(ctx), func, answers);
  }

  @hooks([recoverMW])
  public async callFunc(
    ctx: Context,
    func: Func,
    answers?: ConfigMap
  ): Promise<Result<any, FxError>> {
    return await Executor.callFunc(new CoreContext(ctx), func, answers);
  }

  @hooks([recoverMW])
  public async create(
    ctx: Context,
    answers?: ConfigMap
  ): Promise<Result<string, FxError>> {
    const coreCtx = new CoreContext(ctx);
    const result = await Executor.create(coreCtx, answers);
    if (result.isErr()) {
      return result;
    }
    const folder = result.value;
    const result2 = await Executor.scaffold(coreCtx, answers);
    if (result2.isErr()) {
      return err(result2.error);
    }
    return ok(folder);
  }

  @hooks([recoverMW, concurrentMW])
  public async scaffold(
    ctx: Context,
    answers?: ConfigMap
  ): Promise<Result<null, FxError>> {
    return await Executor.scaffold(new CoreContext(ctx), answers);
  }

  @hooks([recoverMW, concurrentMW])
  public async update(
    ctx: Context,
    answers?: ConfigMap
  ): Promise<Result<null, FxError>> {
    return await Executor.update(new CoreContext(ctx), answers);
  }

  @hooks([recoverMW, concurrentMW])
  public async provision(
    ctx: Context,
    answers?: ConfigMap
  ): Promise<Result<null, FxError>> {
    return await Executor.provision(new CoreContext(ctx), answers);
  }

  @hooks([recoverMW, concurrentMW])
  public async deploy(
    ctx: Context,
    answers?: ConfigMap
  ): Promise<Result<null, FxError>> {
    return await Executor.deploy(new CoreContext(ctx), answers);
  }

  @hooks([recoverMW, concurrentMW])
  public async publish(
    ctx: Context,
    answers?: ConfigMap
  ): Promise<Result<null, FxError>> {
    return await Executor.publish(new CoreContext(ctx), answers);
  }

  @hooks([recoverMW, concurrentMW])
  public async createEnv(
    ctx: Context,
    env: string
  ): Promise<Result<null, FxError>> {
    return await Executor.createEnv(new CoreContext(ctx), env);
  }

  @hooks([recoverMW, concurrentMW])
  public async removeEnv(
    ctx: Context,
    env: string
  ): Promise<Result<null, FxError>> {
    return await Executor.removeEnv(new CoreContext(ctx), env);
  }

  @hooks([recoverMW, concurrentMW])
  public async switchEnv(
    ctx: Context,
    env: string
  ): Promise<Result<null, FxError>> {
    return await Executor.switchEnv(new CoreContext(ctx), env);
  }

  @hooks([recoverMW, concurrentMW])
  public async listEnvs(ctx: Context): Promise<Result<string[], FxError>> {
    return await Executor.listEnvs(new CoreContext(ctx));
  }
}
