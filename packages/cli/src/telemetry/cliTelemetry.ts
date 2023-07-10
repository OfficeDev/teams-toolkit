// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, UserError } from "@microsoft/teamsfx-api";
import { getHashedEnv } from "@microsoft/teamsfx-core";
import { CliTelemetryReporter } from "../commonlib/telemetry";
import { getSettingsVersion } from "../utils";
import {
  TelemetryComponentType,
  TelemetryErrorType,
  TelemetryProperty,
  TelemetrySuccess,
} from "./cliTelemetryEvents";
import CLIUIInstance from "../userInteraction";

export function makeEnvRelatedProperty(
  projectDir: string,
  inputs: Inputs
): { [key: string]: string } {
  const properties: { [key: string]: string } = {};
  if (inputs.env) {
    properties[TelemetryProperty.Env] = getHashedEnv(inputs.env);
  }
  return properties;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export class CliTelemetry {
  private static instance: CliTelemetry;
  private static reporter: CliTelemetryReporter;
  private static rootFolder: string | undefined;
  private static isFromSample: boolean | undefined = undefined;

  public static setReporter(reporter: CliTelemetryReporter): void {
    CliTelemetry.reporter = reporter;
  }

  public static getReporter(): CliTelemetryReporter {
    return CliTelemetry.reporter;
  }

  public static setIsFromSample(isFromSample?: boolean) {
    CliTelemetry.isFromSample = isFromSample;
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
    properties[TelemetryProperty.Interactive] = CLIUIInstance.interactive + "";
    if (TelemetryProperty.Component in properties === false) {
      properties[TelemetryProperty.Component] = TelemetryComponentType;
    }

    if (CliTelemetry.isFromSample !== undefined) {
      properties[TelemetryProperty.IsFromSample] = CliTelemetry.isFromSample.toString();
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
    properties[TelemetryProperty.Interactive] = CLIUIInstance.interactive + "";
    if (TelemetryProperty.Component in properties === false) {
      properties[TelemetryProperty.Component] = TelemetryComponentType;
    }

    if (CliTelemetry.isFromSample !== undefined) {
      properties[TelemetryProperty.IsFromSample] = CliTelemetry.isFromSample.toString();
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
    properties[TelemetryProperty.Interactive] = CLIUIInstance.interactive + "";
    if (TelemetryProperty.Component in properties === false) {
      properties[TelemetryProperty.Component] = TelemetryComponentType;
    }

    if (CliTelemetry.isFromSample !== undefined) {
      properties[TelemetryProperty.IsFromSample] = CliTelemetry.isFromSample.toString();
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
