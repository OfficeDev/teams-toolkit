// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, TelemetryReporter } from "@microsoft/teamsfx-api";
import { cloneDeep } from "lodash";
import { TelemetryConstants } from "../constants";
import { fillInTelemetryPropsForFxError } from "../../common/telemetry";

export class TeamsFxTelemetryReporter {
  constructor(
    private telemetryReporter: TelemetryReporter,
    private defaultConfig?: TeamsFxTelemetryDefaultConfig
  ) {}

  // Will auto append `-start` to eventName
  public sendStartEvent(config: TeamsFxTelemetryConfig): void {
    try {
      const actualConfig = this.mergeConfig(config, this.defaultConfig);
      if (actualConfig.componentName) {
        actualConfig.properties = {
          [TelemetryConstants.properties.component]: actualConfig.componentName,
          ...actualConfig.properties,
        };
      }
      this.telemetryReporter.sendTelemetryEvent(
        actualConfig.eventName + TelemetryConstants.eventPrefix,
        actualConfig.properties,
        actualConfig.measurements
      );
    } catch {
      // ignore errors in telemetry reporter
    }
  }

  // If error is undefined, then treat operation as success. Otherwise treat operation as failed.
  public sendEndEvent(config: TeamsFxTelemetryConfig, error?: FxError): void {
    try {
      const actualConfig = this.mergeConfig(config, this.defaultConfig);
      if (actualConfig.componentName) {
        actualConfig.properties = {
          [TelemetryConstants.properties.component]: actualConfig.componentName,
          ...actualConfig.properties,
        };
      }
      if (error) {
        // sendTelemetryErrorEvent
        actualConfig.properties = actualConfig.properties || {};

        fillInTelemetryPropsForFxError(actualConfig.properties, error);

        if (!actualConfig.errorProps) {
          actualConfig.errorProps = [];
        }
        actualConfig.errorProps = actualConfig.errorProps.concat([
          TelemetryConstants.properties.errorMessage,
        ]);

        this.telemetryReporter.sendTelemetryErrorEvent(
          actualConfig.eventName,
          actualConfig.properties,
          actualConfig.measurements,
          actualConfig.errorProps
        );
      } else {
        // sendTelemetryEvent
        actualConfig.properties = {
          [TelemetryConstants.properties.success]: TelemetryConstants.values.yes,
          ...actualConfig.properties,
        };

        this.telemetryReporter.sendTelemetryEvent(
          actualConfig.eventName,
          actualConfig.properties,
          actualConfig.measurements
        );
      }
    } catch {
      // ignore errors in telemetry reporter
    }
  }

  private mergeConfig(
    config: TeamsFxTelemetryConfig,
    defaultConfig?: TeamsFxTelemetryDefaultConfig
  ): TeamsFxTelemetryConfig {
    const result = cloneDeep(config);
    if (defaultConfig) {
      if (defaultConfig.baseEventName) {
        result.eventName = defaultConfig.baseEventName + result.eventName;
      }
      if (!result.componentName && defaultConfig.componentName) {
        result.componentName = defaultConfig.componentName;
      }
    }
    return result;
  }
}

interface TeamsFxTelemetryDefaultConfig {
  baseEventName?: string;
  componentName?: string;
}

export interface TeamsFxTelemetryConfig {
  eventName: string;
  componentName?: string;
  properties?: { [key: string]: string };
  measurements?: { [key: string]: number };
  errorProps?: string[];
}
