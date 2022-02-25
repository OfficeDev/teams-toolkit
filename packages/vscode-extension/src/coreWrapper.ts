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
  startFn?: (ctx: HookContext) => Promise<void>;
  endFn?: (ctx: HookContext) => Promise<void>;
  telemetry?: {
    component: string;
    eventName?: string;
    properties?: Record<string, string>;
  };
}

export function CommonErrorHandlerMW(option?: ErrorHandleOption): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    try {
      if (option?.startFn) {
        await option?.startFn(ctx);
      }
      if (option?.telemetry) {
        const event = option.telemetry.eventName
          ? option.telemetry.eventName + "-start"
          : kebabCase(ctx.method!) + "-start";
        if (!option.telemetry.properties) {
          option.telemetry.properties = {};
          ctx.arguments.push(option.telemetry.properties);
        }
        // sendTelemetryEvent(option.telemetry.component, event, option.telemetry.properties);
      }
      await next();
      if (option?.endFn) {
        await option?.endFn(ctx);
      }
      if (option?.telemetry) {
        const event = option.telemetry.eventName
          ? option.telemetry.eventName
          : kebabCase(ctx.method!);
        option.telemetry.properties!["success"] = "yes";
        // sendTelemetryEvent(option.telemetry.component, event, option.telemetry.properties);
      }
    } catch (e) {
      const error = option?.error ? option.error : assembleError(e);
      ctx.error = error;
      if (option?.endFn) {
        await option?.endFn(ctx);
      }
      ctx.result = err(error);
      if (option?.telemetry) {
        const event = option.telemetry.eventName
          ? option.telemetry.eventName
          : kebabCase(ctx.method!);
        option.telemetry.properties!["success"] = "no";
        // sendTelemetryErrorEvent(
        //   option.telemetry.component,
        //   event,
        //   error,
        //   option.telemetry.properties
        // );
      }
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
      telemetry: { eventName: "init", component: TelemetryComponentType },
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
      telemetry: { component: TelemetryComponentType },
    }),
  ])
  async addFeature(inputs: v2.InputsWithProjectPath): Promise<Result<Void, FxError>> {
    return await core.addFeature(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
      telemetry: { component: TelemetryComponentType },
    }),
  ])
  async createProject(inputs: Inputs): Promise<Result<string, FxError>> {
    return await core.createProject(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
      telemetry: { eventName: "provision", component: TelemetryComponentType },
    }),
  ])
  async provisionResources(inputs: Inputs): Promise<Result<Void, FxError>> {
    return await core.provisionResources(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
      telemetry: { eventName: "deploy", component: TelemetryComponentType },
    }),
  ])
  async deployArtifacts(inputs: Inputs): Promise<Result<Void, FxError>> {
    return await core.deployArtifacts(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
      telemetry: { eventName: "debug", component: TelemetryComponentType },
    }),
  ])
  async localDebug(inputs: Inputs): Promise<Result<Void, FxError>> {
    return await core.localDebug(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
      telemetry: { eventName: "publish", component: TelemetryComponentType },
    }),
  ])
  async publishApplication(inputs: Inputs): Promise<Result<Void, FxError>> {
    return await core.publishApplication(inputs);
  }

  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
      telemetry: { component: TelemetryComponentType },
    }),
  ])
  async createEnv(inputs: Inputs): Promise<Result<Void, FxError>> {
    return await core.createEnv(inputs);
  }
  @hooks([
    CommonErrorHandlerMW({
      endFn: endFn,
      telemetry: { component: TelemetryComponentType },
    }),
  ])
  async activateEnv(inputs: Inputs): Promise<Result<Void, FxError>> {
    return await core.activateEnv(inputs);
  }

  async encrypt(plaintext: string, inputs: Inputs): Promise<Result<string, FxError>> {
    return await core.encrypt(plaintext, inputs);
  }
  async decrypt(ciphertext: string, inputs: Inputs): Promise<Result<string, FxError>> {
    return await core.decrypt(ciphertext, inputs);
  }
  async grantPermission(inputs: Inputs): Promise<Result<any, FxError>> {
    return await core.grantPermission(inputs);
  }
  async checkPermission(inputs: Inputs): Promise<Result<any, FxError>> {
    return await core.checkPermission(inputs);
  }
  async listCollaborator(inputs: Inputs): Promise<Result<any, FxError>> {
    return await core.listCollaborator(inputs);
  }
}
