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

  public async createProgressBar(
    title: string,
    steps: number
  ): Promise<IProgressHandler | undefined> {
    const progressBar = this.ui?.createProgressBar(title, steps);
    if (progressBar) {
      this.progressBars.push(progressBar);
      await progressBar.start();
      await progressBar.next();
    }
    return progressBar;
  }

  public async endProgressBars(success: boolean): Promise<void> {
    // this.progressBars.forEach((progressbar) => {
    //   await progressbar.end(success);
    // });
    await Promise.all(
      this.progressBars.map(async (progressbar) => {
        await progressbar.end(success);
      })
    );
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
    context.logProvider?.info(getLocalizedString(logMessageKeys.startExecuteDriver, eventName));
    const res = await exec();
    context.wrapTelemetryReporter?.sendEndEvent({
      eventName,
      properties: context.telemetryProperties,
    });
    context.logProvider?.info(getLocalizedString(logMessageKeys.successExecuteDriver, eventName));
    await context.endProgressBars(true);
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
    await context.endProgressBars(false);
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
      message: error.message,
      displayMessage: error.message,
    });
  }
  return fxError;
}
