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
import { FxError, Inputs, UserError } from "@microsoft/teamsfx-api";
import { getHashedEnv } from "@microsoft/teamsfx-core";
import { getSettingsVersion, getTeamsAppIdByEnv } from "../utils";

export function makeEnvRelatedProperty(
  projectDir: string,
  inputs: Inputs
): { [key: string]: string } {
  const properties: { [key: string]: string } = {};
  if (inputs.env) {
    properties[TelemetryProperty.Env] = getHashedEnv(inputs.env);
    const appId = getTeamsAppIdByEnv(projectDir, inputs.env);
    if (appId) {
      properties[TelemetryProperty.AppId] = appId;
    }
  }
  return properties;
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

    const settingsVersion = getSettingsVersion(CliTelemetry.rootFolder);
    if (settingsVersion !== undefined) {
      properties[TelemetryProperty.SettingsVersion] = settingsVersion;
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

    const settingsVersion = getSettingsVersion(CliTelemetry.rootFolder);
    if (settingsVersion !== undefined) {
      properties[TelemetryProperty.SettingsVersion] = settingsVersion;
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

    const settingsVersion = getSettingsVersion(CliTelemetry.rootFolder);
    if (settingsVersion !== undefined) {
      properties[TelemetryProperty.SettingsVersion] = settingsVersion;
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
