// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  IProgressHandler,
  ok,
  Result,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../common/localizeUtils";
import { ErrorConstants } from "../../constants";
import { BaseComponentInnerError } from "../../error/componentError";
import { TeamsFxTelemetryReporter } from "../../utils/teamsFxTelemetryReporter";
import { logMessageKeys } from "../aad/utility/constants";
import { DriverContext } from "../interface/commonArgs";

interface StringMap {
  [key: string]: string;
}

export interface WrapDriverContext extends DriverContext {
  progressBars: IProgressHandler[];
  eventName: string;
  telemetryProperties: StringMap;
  wrapTelemetryReporter?: TeamsFxTelemetryReporter;
}

export class WrapDriverContext {
  constructor(driverContext: DriverContext, eventName: string, componentName: string) {
    Object.assign(this, driverContext, {});
    this.progressBars = [];
    this.eventName = eventName;
    this.telemetryProperties = {
      component: eventName,
    };
    if (driverContext.telemetryReporter) {
      this.wrapTelemetryReporter = new TeamsFxTelemetryReporter(driverContext.telemetryReporter, {
        componentName,
      });
    }
  }

  public createProgressBar(title: string, steps: number): IProgressHandler | undefined {
    const progressBar = this.ui?.createProgressBar(title, steps);
    if (progressBar) {
      this.progressBars.push(progressBar);
      progressBar.start();
    }
    return progressBar;
  }

  public endProgressBars(success: boolean): void {
    this.progressBars.forEach((progressbar) => {
      progressbar.end(success);
    });
  }

  public addTelemetryProperties(properties: { [key: string]: string }): void {
    this.telemetryProperties = { ...properties, ...this.telemetryProperties };
  }
}

export async function wrapRun(
  context: WrapDriverContext,
  exec: () => Promise<Map<string, string>>
): Promise<Result<Map<string, string>, FxError>> {
  const eventName = context.eventName;
  try {
    context.wrapTelemetryReporter?.sendStartEvent({ eventName });
    const res = await exec();
    context.wrapTelemetryReporter?.sendEndEvent({
      eventName,
      properties: context.telemetryProperties,
    });
    return ok(res);
  } catch (error: any) {
    const fxError = getError(context, error);
    context.wrapTelemetryReporter?.sendEndEvent(
      {
        eventName,
        properties: context.telemetryProperties,
      },
      fxError
    );
    return err(fxError);
  }
}

function getError(context: WrapDriverContext, error: any): FxError {
  let fxError: FxError;
  if (error instanceof BaseComponentInnerError) {
    fxError = error.toFxError();
  } else if (error instanceof UserError || error instanceof SystemError) {
    fxError = error;
  } else {
    if (!(error instanceof Error)) {
      error = new Error(error.toString());
    }
    fxError = new SystemError({
      error,
      source: context.eventName,
      name: ErrorConstants.unhandledError,
      message: ErrorConstants.unhandledErrorMessage,
      displayMessage: ErrorConstants.unhandledErrorMessage,
    });
  }
  context.logProvider?.error(
    getLocalizedString(logMessageKeys.failExecuteDriver, context.eventName, error.message)
  );
  return fxError;
}
