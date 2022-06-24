import "mocha";
import {
  ContextV3,
  Effect,
  FxError,
  InputsWithProjectPath,
  IProgressHandler,
  LogLevel,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks/lib";
import { LoggerMW, ActionLogger } from "../../../src/component/middleware/logger";
import { ProgressBarMW } from "../../../src/component/middleware/progressbar";
import {
  RunWithCatchErrorMW,
  ActionErrorHandler,
} from "../../../src/component/middleware/runWithCatchError";
import { TelemetryMW, ActionTelemetryImplement } from "../../../src/component/middleware/telemetry";
import { ActionContext } from "../../../src/component/middleware/types";

export class MockAction {
  static readonly source = "mocker-action";
  static readonly stage = "mocker-stage";
  static readonly componentName = "mocker-component";
  static readonly progressTitle: string = "mocker-progress-bar";
  static readonly progressMessage = {
    first: "step1",
    second: "step2",
  };
  static readonly loggerPrefix = "[Mocker]";
  static readonly logFormatter = (message: string) => `${MockAction.loggerPrefix} ${message}`;
  static readonly logLogMessage = "call logger log";
  static readonly logTraceMessage = "call logger trace";
  static readonly logInfoMessage = "call logger info";
  static readonly logDebugMessage = "call logger debug";
  static readonly logWarningMessage = "call logger warning";
  static readonly logErrorMessage = "call logger error";
  static readonly logFatalMessage = "call logger fatal";

  throwError = false;
  @hooks([
    TelemetryMW(ActionTelemetryImplement.bind(null, MockAction.stage, MockAction.componentName)),
    RunWithCatchErrorMW(MockAction.source, ActionErrorHandler),
    ProgressBarMW(MockAction.progressTitle, Object.keys(MockAction.progressMessage).length),
    LoggerMW(ActionLogger.bind(null, MockAction.logFormatter)),
  ]) // the @hooks decorator
  async execute(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Effect[], FxError>> {
    const ctx = context as ActionContext;
    ctx.progressBar?.next(MockAction.progressMessage.first);
    ctx.progressBar?.next(MockAction.progressMessage.second);
    ctx.logger?.log(LogLevel.Trace, MockAction.logLogMessage);
    ctx.logger?.trace(MockAction.logTraceMessage);
    ctx.logger?.info(MockAction.logInfoMessage);
    ctx.logger?.debug(MockAction.logDebugMessage);
    ctx.logger?.warning(MockAction.logWarningMessage);
    ctx.logger?.error(MockAction.logErrorMessage);
    ctx.logger?.fatal(MockAction.logFatalMessage);

    ctx.telemetry?.sendTelemetryEvent("inner telemetry");
    if (this.throwError) {
      throw new Error("mock error");
    } else {
      return ok(["mock"]);
    }
  }
}

export const mockProgressHandler: IProgressHandler = {
  start: async (detail?: string): Promise<void> => {},
  next: async (detail?: string): Promise<void> => {},
  end: async (): Promise<void> => {},
};
