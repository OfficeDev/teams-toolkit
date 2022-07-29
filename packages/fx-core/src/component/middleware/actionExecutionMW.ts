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
  ok,
  QTreeNode,
  Result,
  SystemError,
  traverse,
  UserError,
} from "@microsoft/teamsfx-api";
import { assign } from "lodash";
import { globalVars, TOOLS } from "../../core/globalVars";
import { TelemetryConstants } from "../constants";
import { validateQuestion } from "../workflow";

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
    const componentName = ctx.self?.constructor.name || action?.componentName;
    const methodName = ctx.method!;
    const actionName = `${componentName}.${methodName}`;
    TOOLS.logProvider.info(`execute [${actionName}] start!`);
    const eventName = action.telemetryEventName || methodName;
    const telemetryProps = {
      [TelemetryConstants.properties.component]: componentName,
      [TelemetryConstants.properties.appId]: globalVars.teamsAppId,
      [TelemetryConstants.properties.tenantId]: globalVars.m365TenantId,
    };
    let progressBar;
    try {
      // send start telemetry
      if (action.enableTelemetry) {
        if (action.telemetryProps) assign(telemetryProps, action.telemetryProps);
        const startEvent = eventName + "-start";
        TOOLS.telemetryReporter?.sendTelemetryEvent(startEvent, telemetryProps);
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
        progressBar.start();
      }
      if (action.enableTelemetry || action.enableProgressBar) {
        const actionContext: ActionContext = {
          progressBar: progressBar,
          telemetryProps: telemetryProps,
        };
        ctx.arguments.push(actionContext);
      }
      await next();
      if (ctx.result.isErr()) throw ctx.result.error;
      // send end telemetry
      if (action.enableTelemetry) {
        TOOLS.telemetryReporter?.sendTelemetryEvent(eventName, {
          ...telemetryProps,
          [TelemetryConstants.properties.success]: TelemetryConstants.values.yes,
        });
      }
      progressBar?.end(true);
      TOOLS.logProvider.info(`execute [${actionName}] success!`);
    } catch (e) {
      progressBar?.end(false);
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
        const errorCode = fxError.source + "." + fxError.name;
        const errorType =
          fxError instanceof SystemError
            ? TelemetryConstants.values.systemError
            : TelemetryConstants.values.userError;
        TOOLS.telemetryReporter?.sendTelemetryErrorEvent(eventName, {
          ...telemetryProps,
          [TelemetryConstants.properties.success]: TelemetryConstants.values.no,
          [TelemetryConstants.properties.errorCode]: errorCode,
          [TelemetryConstants.properties.errorType]: errorType,
          [TelemetryConstants.properties.errorMessage]: fxError.message,
        });
      }
      TOOLS.logProvider.info(`execute [${actionName}] failed!`);
      ctx.result = err(fxError);
    }
  };
}
