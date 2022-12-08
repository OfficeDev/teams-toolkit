// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks/lib";
import {
  ActionContext,
  assembleError,
  ContextV3,
  Effect,
  err,
  ErrorHandler,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  QTreeNode,
  Result,
  SystemError,
  traverse,
  UserError,
} from "@microsoft/teamsfx-api";
import { assign, merge } from "lodash";
import { globalVars, TOOLS } from "../../core/globalVars";
import { TelemetryConstants } from "../constants";
import { DriverContext } from "../driver/interface/commonArgs";
import {
  sendErrorEvent,
  sendMigratedErrorEvent,
  sendMigratedStartEvent,
  sendMigratedSuccessEvent,
  sendStartEvent,
  sendSuccessEvent,
} from "../telemetry";
import { settingsUtil } from "../utils/settingsUtil";

export interface ActionOption {
  componentName?: string;
  errorSource?: string;
  errorHelpLink?: string;
  errorIssueLink?: string;
  errorHandler?: ErrorHandler;
  enableTelemetry?: boolean;
  telemetryComponentName?: string;
  telemetryEventName?: string;
  telemetryProps?: Record<string, string>;
  enableProgressBar?: boolean;
  progressTitle?: string;
  progressSteps?: number;
  plan?: (
    context: ContextV3,
    inputs: InputsWithProjectPath
  ) => MaybePromise<Result<Effect[], FxError>>;
  question?: (
    context: ContextV3,
    inputs: InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
}

export function ActionExecutionMW(action: ActionOption): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const componentName = action.componentName || ctx.self?.constructor.name;
    const telemetryComponentName = action.telemetryComponentName || componentName;
    const methodName = ctx.method!;
    const eventName = action.telemetryEventName || methodName;
    const telemetryProps = {
      [TelemetryConstants.properties.component]: telemetryComponentName,
      env: process.env.TEAMSFX_ENV || "",
    };
    const telemetryMeasures: Record<string, number> = {};
    let progressBar;
    try {
      // send start telemetry
      if (action.enableTelemetry) {
        if (!globalVars.trackingId) {
          // try to get trackingId
          const projectPath = (ctx.arguments[0] as ContextV3 | DriverContext).projectPath;
          if (projectPath) {
            await settingsUtil.readSettings(projectPath, false);
          }
        }
        if (action.telemetryProps) assign(telemetryProps, action.telemetryProps);
        if (globalVars.trackingId) telemetryProps["project-id"] = globalVars.trackingId; // add trackingId prop in telemetry
        sendStartEvent(eventName, telemetryProps);
        sendMigratedStartEvent(
          eventName,
          ctx.arguments[0] as ContextV3,
          ctx.arguments[1] as InputsWithProjectPath,
          telemetryProps
        );
      }
      // run question model
      if (action.question) {
        const context = ctx.arguments[0] as ContextV3;
        const inputs = ctx.arguments[1] as InputsWithProjectPath;
        const getQuestionRes = await action.question(context, inputs);
        if (getQuestionRes.isErr()) throw getQuestionRes.error;
        const node = getQuestionRes.value;
        if (node) {
          const askQuestionRes = await traverse(
            node,
            inputs,
            context.userInteraction,
            context.telemetryReporter
          );
          if (askQuestionRes.isErr()) throw askQuestionRes.error;
        }
      }
      // progress bar
      if (action.enableProgressBar) {
        progressBar = TOOLS.ui.createProgressBar(
          action.progressTitle || methodName,
          action.progressSteps || 1
        );
        await progressBar.start();
      }
      if (action.enableTelemetry || action.enableProgressBar) {
        const actionContext: ActionContext = {
          progressBar: progressBar,
          telemetryProps: telemetryProps,
          telemetryMeasures: telemetryMeasures,
        };
        ctx.arguments.push(actionContext);
      }
      const startTime = new Date().getTime();
      await next();
      const timeCost = new Date().getTime() - startTime;
      if (ctx.result?.isErr && ctx.result.isErr()) throw ctx.result.error;
      // send end telemetry
      merge(telemetryMeasures, { [TelemetryConstants.properties.timeCost]: timeCost });
      if (action.enableTelemetry) {
        sendSuccessEvent(eventName, telemetryProps, telemetryMeasures);
        sendMigratedSuccessEvent(
          eventName,
          ctx.arguments[0] as ContextV3,
          ctx.arguments[1] as InputsWithProjectPath,
          telemetryProps,
          telemetryMeasures
        );
      }
      await progressBar?.end(true);
    } catch (e) {
      await progressBar?.end(false);
      let fxError;
      if (action.errorHandler) {
        fxError = action.errorHandler(e, telemetryProps);
      } else {
        fxError = assembleError(e);
        if (fxError.source === "unknown") {
          fxError.source = action.errorSource || fxError.source;
          if (fxError instanceof UserError) {
            fxError.helpLink = fxError.helpLink || action.errorHelpLink;
          }
          if (fxError instanceof SystemError) {
            fxError.issueLink = fxError.issueLink || action.errorIssueLink;
          }
        }
      }
      // send error telemetry
      if (action.enableTelemetry) {
        sendErrorEvent(eventName, fxError, telemetryProps);
        sendMigratedErrorEvent(
          eventName,
          fxError,
          ctx.arguments[0] as ContextV3,
          ctx.arguments[1] as InputsWithProjectPath,
          telemetryProps
        );
      }
      ctx.result = err(fxError);
    }
  };
}
