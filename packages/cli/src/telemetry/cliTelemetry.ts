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
import { getHashedEnv } from "@microsoft/teamsfx-core/build/common/tools";
import { getIsM365, getSettingsVersion, getTeamsAppTelemetryInfoByEnv } from "../utils";

export function makeEnvRelatedProperty(
  projectDir: string,
  inputs: Inputs
): { [key: string]: string } {
  const properties: { [key: string]: string } = {};
  if (inputs.env) {
    properties[TelemetryProperty.Env] = getHashedEnv(inputs.env);
    const appInfo = getTeamsAppTelemetryInfoByEnv(projectDir, inputs.env);
    if (appInfo) {
      properties[TelemetryProperty.AppId] = appInfo.appId;
      properties[TelemetryProperty.TenantId] = appInfo.tenantId;
    }
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

    const isM365 = getIsM365(CliTelemetry.rootFolder);
    if (isM365 !== undefined) {
      properties[TelemetryProperty.IsM365] = isM365;
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

    if (CliTelemetry.isFromSample !== undefined) {
      properties[TelemetryProperty.IsFromSample] = CliTelemetry.isFromSample.toString();
    }

    const settingsVersion = getSettingsVersion(CliTelemetry.rootFolder);
    if (settingsVersion !== undefined) {
      properties[TelemetryProperty.SettingsVersion] = settingsVersion;
    }

    const isM365 = getIsM365(CliTelemetry.rootFolder);
    if (isM365 !== undefined) {
      properties[TelemetryProperty.IsM365] = isM365;
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

    if (CliTelemetry.isFromSample !== undefined) {
      properties[TelemetryProperty.IsFromSample] = CliTelemetry.isFromSample.toString();
    }

    const settingsVersion = getSettingsVersion(CliTelemetry.rootFolder);
    if (settingsVersion !== undefined) {
      properties[TelemetryProperty.SettingsVersion] = settingsVersion;
    }

    const isM365 = getIsM365(CliTelemetry.rootFolder);
    if (isM365 !== undefined) {
      properties[TelemetryProperty.IsM365] = isM365;
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
