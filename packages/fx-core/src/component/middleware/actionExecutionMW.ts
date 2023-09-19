// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks/lib";
import {
  Context,
  FxError,
  IProgressHandler,
  InputsWithProjectPath,
  MaybePromise,
  IQTreeNode,
  Result,
  SystemError,
  UserError,
  err,
} from "@microsoft/teamsfx-api";
import { assign, merge } from "lodash";
import { TOOLS, globalVars } from "../../core/globalVars";
import { assembleError } from "../../error/common";
import { traverse } from "../../ui/visitor";
import { TelemetryConstants } from "../constants";
import { DriverContext } from "../driver/interface/commonArgs";
import { sendErrorEvent, sendStartEvent, sendSuccessEvent } from "../telemetry";
import { settingsUtil } from "../utils/settingsUtil";

interface ActionOption {
  componentName?: string;
  errorSource?: string;
  errorHelpLink?: string;
  errorIssueLink?: string;
  enableTelemetry?: boolean;
  telemetryComponentName?: string;
  telemetryEventName?: string;
  telemetryProps?: Record<string, string>;
  enableProgressBar?: boolean;
  progressTitle?: string;
  progressSteps?: number;
  question?: (
    context: Context,
    inputs: InputsWithProjectPath
  ) => MaybePromise<Result<IQTreeNode | undefined, FxError>>;
}
export interface ActionContext {
  progressBar?: IProgressHandler;
  telemetryProps?: Record<string, string>;
  telemetryMeasures?: Record<string, number>;
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
          const projectPath = (ctx.arguments[0] as Context | DriverContext).projectPath;
          if (projectPath) {
            await settingsUtil.readSettings(projectPath, false);
          }
        }
        if (action.telemetryProps) assign(telemetryProps, action.telemetryProps);
        if (globalVars.trackingId) telemetryProps["project-id"] = globalVars.trackingId; // add trackingId prop in telemetry
        sendStartEvent(eventName, telemetryProps);
      }
      // run question model
      if (action.question) {
        const context = ctx.arguments[0] as Context;
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
      }
      await progressBar?.end(true);
    } catch (e) {
      await progressBar?.end(false);
      const fxError = assembleError(e);
      if (fxError.source === "unknown") {
        fxError.source = action.errorSource || fxError.source;
        if (fxError instanceof UserError) {
          fxError.helpLink = fxError.helpLink || action.errorHelpLink;
        }
        if (fxError instanceof SystemError) {
          fxError.issueLink = fxError.issueLink || action.errorIssueLink;
        }
      }
      // send error telemetry
      if (action.enableTelemetry) {
        sendErrorEvent(eventName, fxError, telemetryProps);
      }
      ctx.result = err(fxError);
    }
  };
}
