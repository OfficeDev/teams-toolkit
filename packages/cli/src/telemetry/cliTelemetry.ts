// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CliTelemetryReporter } from "../commonlib/telemetry";
import {
  TelemetryProperty,
  TelemetryComponentType,
  TelemetrySuccess,
  TelemetryErrorType
} from "./cliTelemetryEvents";
import { FxError, UserError } from "fx-api";
import { getTeamsAppId } from "../utils";

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

  public withRootFolder(rootFolder: string): CliTelemetry {
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

    properties[TelemetryProperty.AapId] = getTeamsAppId(CliTelemetry.rootFolder);

    CliTelemetry.reporter.withRootFolder(CliTelemetry.rootFolder).sendTelemetryEvent(eventName, properties, measurements);
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

    properties[TelemetryProperty.AapId] = getTeamsAppId(CliTelemetry.rootFolder);

    properties[TelemetryProperty.Success] = TelemetrySuccess.No;
    if (error instanceof UserError) {
      properties[TelemetryProperty.ErrorType] = TelemetryErrorType.UserError;
    } else {
      properties[TelemetryProperty.ErrorType] = TelemetryErrorType.SystemError;
    }

    properties[TelemetryProperty.ErrorCode] = `${error.source}.${error.name}`;
    properties[TelemetryProperty.ErrorMessage] = error.message;

    CliTelemetry.reporter.withRootFolder(CliTelemetry.rootFolder).sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);
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

    properties[TelemetryProperty.AapId] = getTeamsAppId(CliTelemetry.rootFolder);

    CliTelemetry.reporter.withRootFolder(CliTelemetry.rootFolder).sendTelemetryException(error, properties, measurements);
  }

  public flush(): void {
    CliTelemetry.reporter.flush();
  }
}

export default CliTelemetry.getInstance();
