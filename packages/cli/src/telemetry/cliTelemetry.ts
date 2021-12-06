// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { CliTelemetryReporter } from "../commonlib/telemetry";
import {
  TelemetryProperty,
  TelemetryComponentType,
  TelemetrySuccess,
  TelemetryErrorType,
} from "./cliTelemetryEvents";
import { FxError, UserError } from "@microsoft/teamsfx-api";
import { getHashedEnv } from "@microsoft/teamsfx-core";
import { getCreatedFrom, getTeamsAppId } from "../utils";

export function makeEnvProperty(
  env: string | undefined
): { [TelemetryProperty.Env]: string } | undefined {
  return env ? { [TelemetryProperty.Env]: getHashedEnv(env) } : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export class CliTelemetry {
  private static instance: CliTelemetry;
  private static reporter: CliTelemetryReporter;
  private static rootFolder: string | undefined;

  public static setReporter(reporter: CliTelemetryReporter): void {
    CliTelemetry.reporter = reporter;
  }

  public static getReporter(): CliTelemetryReporter {
    return CliTelemetry.reporter;
  }

  public static getInstance(): CliTelemetry {
    if (!CliTelemetry.instance) {
      CliTelemetry.instance = new CliTelemetry();
    }

    return CliTelemetry.instance;
  }

  public withRootFolder(rootFolder: string | undefined): CliTelemetry {
    CliTelemetry.rootFolder = rootFolder;
    return CliTelemetry.instance;
  }

  public sendTelemetryEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }

    if (TelemetryProperty.Component in properties === false) {
      properties[TelemetryProperty.Component] = TelemetryComponentType;
    }

    properties[TelemetryProperty.AppId] = getTeamsAppId(CliTelemetry.rootFolder);
    const createdFrom = getCreatedFrom(CliTelemetry.rootFolder);
    if (createdFrom !== undefined) {
      properties[TelemetryProperty.CreatedFrom] = createdFrom;
    }

    CliTelemetry.reporter
      .withRootFolder(CliTelemetry.rootFolder)
      .sendTelemetryEvent(eventName, properties, measurements);
  }

  public sendTelemetryErrorEvent(
    eventName: string,
    error: FxError,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number },
    errorProps?: string[]
  ): void {
    if (!properties) {
      properties = {};
    }

    if (TelemetryProperty.Component in properties === false) {
      properties[TelemetryProperty.Component] = TelemetryComponentType;
    }

    properties[TelemetryProperty.AppId] = getTeamsAppId(CliTelemetry.rootFolder);
    const createdFrom = getCreatedFrom(CliTelemetry.rootFolder);
    if (createdFrom !== undefined) {
      properties[TelemetryProperty.CreatedFrom] = createdFrom;
    }

    properties[TelemetryProperty.Success] = TelemetrySuccess.No;
    if (error instanceof UserError) {
      properties[TelemetryProperty.ErrorType] = TelemetryErrorType.UserError;
    } else {
      properties[TelemetryProperty.ErrorType] = TelemetryErrorType.SystemError;
    }

    properties[TelemetryProperty.ErrorCode] = `${error.source}.${error.name}`;
    properties[TelemetryProperty.ErrorMessage] = error.message;

    CliTelemetry.reporter
      .withRootFolder(CliTelemetry.rootFolder)
      .sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);
  }

  public sendTelemetryException(
    error: Error,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }

    if (TelemetryProperty.Component in properties === false) {
      properties[TelemetryProperty.Component] = TelemetryComponentType;
    }

    properties[TelemetryProperty.AppId] = getTeamsAppId(CliTelemetry.rootFolder);
    const createdFrom = getCreatedFrom(CliTelemetry.rootFolder);
    if (createdFrom !== undefined) {
      properties[TelemetryProperty.CreatedFrom] = createdFrom;
    }

    CliTelemetry.reporter
      .withRootFolder(CliTelemetry.rootFolder)
      .sendTelemetryException(error, properties, measurements);
  }

  public async flush(): Promise<void> {
    await CliTelemetry.reporter.flush();
  }
}

export default CliTelemetry.getInstance();
