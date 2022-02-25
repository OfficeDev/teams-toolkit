// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CoreCallbackEvent,
  CoreCallbackFunc,
  Func,
  FunctionRouter,
  FxError,
  Inputs,
  QTreeNode,
  Result,
  Stage,
  Void,
  assembleError,
  err,
  v3,
  v2,
} from "@microsoft/teamsfx-api";
import { core } from "./handlers";
import { HookContext, Middleware, NextFunction, hooks } from "@feathersjs/hooks";
import { kebabCase } from "lodash";
import { TelemetryComponentType } from "./telemetry/extTelemetryEvents";

export interface ErrorHandleOption {
  error?: FxError;
  startFn?: (ctx: HookContext) => Promise<Result<any, FxError>>;
  endFn?: (ctx: HookContext) => Promise<void>;
  telemetry?: {
    eventName?: string;
    properties?: Record<string, string>;
  };
}

export function CommonErrorHandlerMW(option?: ErrorHandleOption): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const startEvent = option?.telemetry?.eventName
      ? option.telemetry.eventName + "-start"
      : kebabCase(ctx.method!) + "-start";
    const endEvent = option?.telemetry?.eventName
      ? option.telemetry.eventName
      : kebabCase(ctx.method!);
    let props = {};
    if (option?.telemetry?.properties) {
      props = option.telemetry.properties;
    }
    ctx.arguments.push(props);
    try {
      if (option?.startFn) {
        const res = await option?.startFn(ctx);
        if (res.isErr()) {
          ctx.result = err(res.error);
        }
      }
      // sendTelemetryEvent("extension", startEvent, option.telemetry.properties);
      await next();
      if (option?.endFn) {
        await option?.endFn(ctx);
      }
      const result = ctx.result as Result<any, FxError>;
      props["success"] = result.isOk() ? "yes" : "no";
      if (result.isOk()) {
        // sendTelemetryEvent(option.telemetry.component, endEvent, option.telemetry.properties);
      } else {
        // sendTelemetryErrorEvent(
        //   "extension",
        //   endEvent,
        //   result.error,
        //   option.telemetry.properties
        // );
      }
    } catch (e) {
      const error = option?.error ? option.error : assembleError(e);
      ctx.error = error;
      if (option?.endFn) {
        await option?.endFn(ctx);
      }
      ctx.result = err(error);
      props["success"] = "no";
      // sendTelemetryErrorEvent(
      //   "extension",
      //   event,
      //   error,
      //   props
      // );
    }
  };
}

async function endFn(ctx: HookContext): Promise<void> {
  const res = ctx.result as Result<any, FxError>;
}

export class FxCoreWrapper {
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
      telemetry: { eventName: "init" },
    }),
  ])
  async init(
    inputs: Inputs & { projectPath: string } & { solution?: string | undefined }
  ): Promise<Result<Void, FxError>> {
    return await core.init(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
    }),
  ])
  async addFeature(inputs: v2.InputsWithProjectPath): Promise<Result<Void, FxError>> {
    return await core.addFeature(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
    }),
  ])
  async createProject(inputs: Inputs): Promise<Result<string, FxError>> {
    return await core.createProject(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
      telemetry: { eventName: "provision" },
    }),
  ])
  async provisionResources(inputs: Inputs): Promise<Result<Void, FxError>> {
    return await core.provisionResources(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
      telemetry: { eventName: "deploy" },
    }),
  ])
  async deployArtifacts(inputs: Inputs): Promise<Result<Void, FxError>> {
    return await core.deployArtifacts(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
      telemetry: { eventName: "debug" },
    }),
  ])
  async localDebug(inputs: Inputs): Promise<Result<Void, FxError>> {
    return await core.localDebug(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
      telemetry: { eventName: "publish" },
    }),
  ])
  async publishApplication(inputs: Inputs): Promise<Result<Void, FxError>> {
    return await core.publishApplication(inputs);
  }

  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
    }),
  ])
  async createEnv(inputs: Inputs): Promise<Result<Void, FxError>> {
    return await core.createEnv(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
    }),
  ])
  async activateEnv(inputs: Inputs): Promise<Result<Void, FxError>> {
    return await core.activateEnv(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
    }),
  ])
  async encrypt(plaintext: string, inputs: Inputs): Promise<Result<string, FxError>> {
    return await core.encrypt(plaintext, inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
    }),
  ])
  async decrypt(ciphertext: string, inputs: Inputs): Promise<Result<string, FxError>> {
    return await core.decrypt(ciphertext, inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
    }),
  ])
  async grantPermission(inputs: Inputs): Promise<Result<any, FxError>> {
    return await core.grantPermission(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
    }),
  ])
  async checkPermission(inputs: Inputs): Promise<Result<any, FxError>> {
    return await core.checkPermission(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
    }),
  ])
  async listCollaborator(inputs: Inputs): Promise<Result<any, FxError>> {
    return await core.listCollaborator(inputs);
  }
}
