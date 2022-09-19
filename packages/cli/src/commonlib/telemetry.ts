// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import Reporter from "../telemetry/telemetryReporter";
import { TelemetryReporter } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import { getFixedCommonProjectSettings } from "@microsoft/teamsfx-core/build/common/tools";
import { TelemetryProperty } from "../telemetry/cliTelemetryEvents";
import { getAllFeatureFlags } from "../utils";
import { CliConfigOptions } from "../userSetttings";
import { tryDetectCICDPlatform } from "./common/cicdPlatformDetector";

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
      this.addSharedProperty(TelemetryProperty.IsFromSample, fixedProjectSettings?.isFromSample);
      this.addSharedProperty(
        TelemetryProperty.ProgrammingLanguage,
        fixedProjectSettings?.programmingLanguage
      );
      this.addSharedProperty(TelemetryProperty.HostType, fixedProjectSettings?.hostType);
      this.addSharedProperty(TelemetryProperty.IsM365, fixedProjectSettings?.isM365);
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

    const featureFlags = getAllFeatureFlags();
    properties[TelemetryProperty.FeatureFlags] = featureFlags ? featureFlags.join(";") : "";

    this.reporter.sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);
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

    const featureFlags = getAllFeatureFlags();
    properties[TelemetryProperty.FeatureFlags] = featureFlags ? featureFlags.join(";") : "";

    this.reporter.sendTelemetryEvent(eventName, properties, measurements);
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

    const featureFlags = getAllFeatureFlags();
    properties[TelemetryProperty.FeatureFlags] = featureFlags ? featureFlags.join(";") : "";

    this.reporter.sendTelemetryException(error, properties, measurements);
  }

  async flush(): Promise<void> {
    await this.reporter.flush();
  }

  private checkAndOverwriteSharedProperty(properties: { [p: string]: string }) {
    if (
      !properties[TelemetryProperty.ProjectId] ||
      !properties[TelemetryProperty.ProgrammingLanguage] ||
      !properties[TelemetryProperty.IsFromSample]
    ) {
      const fixedProjectSettings = getFixedCommonProjectSettings(this.rootFolder);

      if (fixedProjectSettings?.projectId) {
        properties[TelemetryProperty.ProjectId] = fixedProjectSettings?.projectId;
        this.sharedProperties[TelemetryProperty.ProjectId] = fixedProjectSettings?.projectId;
      }

      if (fixedProjectSettings?.programmingLanguage) {
        properties[TelemetryProperty.ProgrammingLanguage] =
          fixedProjectSettings?.programmingLanguage;
        this.sharedProperties[TelemetryProperty.ProgrammingLanguage] =
          fixedProjectSettings?.programmingLanguage;
      }

      if (fixedProjectSettings?.isFromSample) {
        properties[TelemetryProperty.IsFromSample] = fixedProjectSettings?.isFromSample;
        this.sharedProperties[TelemetryProperty.IsFromSample] = fixedProjectSettings?.isFromSample;
      }
    }
  }
}
