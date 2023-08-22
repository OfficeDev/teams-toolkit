// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import Reporter from "../telemetry/telemetryReporter";
import { TelemetryReporter } from "@microsoft/teamsfx-api";
import { Correlator, getFixedCommonProjectSettings } from "@microsoft/teamsfx-core";
import { TelemetryProperty } from "../telemetry/cliTelemetryEvents";
import { CliConfigOptions } from "../userSetttings";
import { tryDetectCICDPlatform } from "./common/cicdPlatformDetector";
import { logger } from "./logger";

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
  private sharedProperties: { [key: string]: string } = {};

  constructor(key: string, cliName: string, cliVersion: string, appRoot?: string) {
    this.reporter = new Reporter(cliName, cliVersion, key, appRoot);
  }

  withRootFolder(rootPath: string | undefined): CliTelemetryReporter {
    if (rootPath) {
      this.rootFolder = rootPath;
      this.reporter.setAppRoot(rootPath);

      // add shared properties
      const fixedProjectSettings = getFixedCommonProjectSettings(rootPath);
      this.addSharedProperty(TelemetryProperty.ProjectId, fixedProjectSettings?.projectId);
    }
    return this;
  }

  addSharedProperty(name: string, value?: string): void {
    this.sharedProperties[name] = value ?? "";
  }

  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number },
    errorProps?: string[]
  ): void {
    if (!properties) {
      properties = { ...this.sharedProperties };
    } else {
      properties = { ...this.sharedProperties, ...properties };
    }

    this.checkAndOverwriteSharedProperty(properties);
    properties[TelemetryProperty.CorrelationId] = Correlator.getId();

    properties[CliConfigOptions.RunFrom] = tryDetectCICDPlatform();

    this.reporter.sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);

    void logger.debug(
      `sendTelemetryErrorEvent ===> ${eventName}, properties: ${JSON.stringify(properties)}`
    );
  }

  sendTelemetryEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
    if (!properties) {
      properties = { ...this.sharedProperties };
    } else {
      properties = { ...this.sharedProperties, ...properties };
    }

    this.checkAndOverwriteSharedProperty(properties);
    properties[TelemetryProperty.CorrelationId] = Correlator.getId();

    properties[CliConfigOptions.RunFrom] = tryDetectCICDPlatform();

    this.reporter.sendTelemetryEvent(eventName, properties, measurements);

    void logger.debug(
      `sendTelemetryEvent ===> ${eventName}, properties: ${JSON.stringify(properties)}`
    );
  }

  sendTelemetryException(
    error: Error,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
    if (!properties) {
      properties = { ...this.sharedProperties };
    } else {
      properties = { ...this.sharedProperties, ...properties };
    }

    this.checkAndOverwriteSharedProperty(properties);
    properties[TelemetryProperty.CorrelationId] = Correlator.getId();

    properties[CliConfigOptions.RunFrom] = tryDetectCICDPlatform();

    this.reporter.sendTelemetryException(error, properties, measurements);
  }

  async flush(): Promise<void> {
    await this.reporter.flush();
  }

  private checkAndOverwriteSharedProperty(properties: { [p: string]: string }) {
    if (!properties[TelemetryProperty.ProjectId]) {
      const fixedProjectSettings = getFixedCommonProjectSettings(this.rootFolder);

      if (fixedProjectSettings?.projectId) {
        properties[TelemetryProperty.ProjectId] = fixedProjectSettings?.projectId;
        this.sharedProperties[TelemetryProperty.ProjectId] = fixedProjectSettings?.projectId;
      }
    }
  }
}
