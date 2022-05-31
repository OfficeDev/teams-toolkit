// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import Reporter from "../telemetry/telemetryReporter";
import { TelemetryReporter } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core";
import { TelemetryProperty } from "../telemetry/cliTelemetryEvents";
import {
  getAllFeatureFlags,
  getCreationVersion,
  getIsFromSample,
  getIsM365,
  getProjectId,
  getSettingsVersion,
} from "../utils";
import { CliConfigOptions, CliConfigRunFrom, UserSettings } from "../userSetttings";

/**
 *  CLI telemetry reporter used by fx-core.
 *  Usage:
 *    let reporter = new CliTelemetryReporter(key, cliName, cliVersion, appRoot)
 *  Illustrate:
 *    key = <'the application insights key'>, 'aiKey' in package.json
 *    extensionVersion = '<extension version>', extension version will be reported as a property with each event
 *    extensionId = '<your extension unique name>', all events will be prefixed with this event name. eg: 'extensionId/eventname'
 */
export class CliTelemetryReporter implements TelemetryReporter {
  private readonly reporter: Reporter;
  private rootFolder: string | undefined;

  constructor(key: string, cliName: string, cliVersion: string, appRoot?: string) {
    this.reporter = new Reporter(cliName, cliVersion, key, appRoot);
  }

  withRootFolder(rootPath: string | undefined): CliTelemetryReporter {
    if (rootPath) {
      this.rootFolder = rootPath;
      this.reporter.setAppRoot(rootPath);
    }
    return this;
  }

  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number },
    errorProps?: string[]
  ): void {
    if (!properties) {
      properties = {};
    }

    const projectId = getProjectId(this.rootFolder);
    properties[TelemetryProperty.ProjectId] = projectId ? projectId : "";
    properties[TelemetryProperty.CorrelationId] = Correlator.getId();

    const result = UserSettings.getRunFromSetting();
    const runFrom = result.isOk() ? result.value : CliConfigRunFrom.Other;
    properties[CliConfigOptions.RunFrom] = runFrom;

    const featureFlags = getAllFeatureFlags();
    properties[TelemetryProperty.FeatureFlags] = featureFlags ? featureFlags.join(";") : "";

    this.addSharedProperties(properties);

    this.reporter.sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);
  }

  sendTelemetryEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }

    const projectId = getProjectId(this.rootFolder);
    properties[TelemetryProperty.ProjectId] = projectId ? projectId : "";
    properties[TelemetryProperty.CorrelationId] = Correlator.getId();

    const result = UserSettings.getRunFromSetting();
    const runFrom = result.isOk() ? result.value : CliConfigRunFrom.Other;
    properties[CliConfigOptions.RunFrom] = runFrom;

    const featureFlags = getAllFeatureFlags();
    properties[TelemetryProperty.FeatureFlags] = featureFlags ? featureFlags.join(";") : "";

    this.addSharedProperties(properties);

    this.reporter.sendTelemetryEvent(eventName, properties, measurements);
  }

  sendTelemetryException(
    error: Error,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }

    const projectId = getProjectId(this.rootFolder);
    properties[TelemetryProperty.ProjectId] = projectId ? projectId : "";
    properties[TelemetryProperty.CorrelationId] = Correlator.getId();

    const result = UserSettings.getRunFromSetting();
    const runFrom = result.isOk() ? result.value : CliConfigRunFrom.Other;
    properties[CliConfigOptions.RunFrom] = runFrom;

    const featureFlags = getAllFeatureFlags();
    properties[TelemetryProperty.FeatureFlags] = featureFlags ? featureFlags.join(";") : "";

    this.addSharedProperties(properties);

    this.reporter.sendTelemetryException(error, properties, measurements);
  }

  async flush(): Promise<void> {
    await this.reporter.flush();
  }

  private async addSharedProperties(properties: { [p: string]: string }): Promise<void> {
    const isFromSample = getIsFromSample(this.rootFolder);
    if (isFromSample !== undefined) {
      properties[TelemetryProperty.SettingsVersion] = isFromSample;
    }

    const settingsVersion = getSettingsVersion(this.rootFolder);
    if (settingsVersion !== undefined) {
      properties[TelemetryProperty.SettingsVersion] = settingsVersion;
    }

    const isM365 = getIsM365(this.rootFolder);
    if (isM365 !== undefined) {
      properties[TelemetryProperty.IsM365] = isM365;
    }

    const creationVersion = getCreationVersion(this.rootFolder);
    if (creationVersion !== undefined) {
      // Encode to prevent package name from being incorrectly identified as email address.
      // Use base64 because kusto has native support.
      const creationVersionEncoded = Buffer.from(creationVersion).toString("base64");
      properties[TelemetryProperty.CreationVersion] = creationVersionEncoded;
    }
  }
}
