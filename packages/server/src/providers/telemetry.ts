// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessageConnection } from "vscode-jsonrpc";

import { TelemetryReporter } from "@microsoft/teamsfx-api";

import { Correlator } from "@microsoft/teamsfx-core";
import { NotificationTypes } from "../apis";

enum TelemetryProperty {
  CorrelationId = "correlation-id",
}

export default class ServerTelemetryReporter implements TelemetryReporter {
  private readonly connection: MessageConnection;

  constructor(connection: MessageConnection) {
    this.connection = connection;
  }

  sendTelemetryEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }

    properties[TelemetryProperty.CorrelationId] = Correlator.getId();
    this.connection.sendNotification(
      NotificationTypes.telemetry.sendTelemetryEvent,
      eventName,
      properties,
      measurements
    );
  }

  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
  ): void {
    if (!properties) {
      properties = {};
    }

    properties[TelemetryProperty.CorrelationId] = Correlator.getId();
    this.connection.sendNotification(
      NotificationTypes.telemetry.sendTelemetryErrorEvent,
      eventName,
      properties,
      measurements,
      errorProps
    );
  }

  sendTelemetryException(
    error: Error,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }

    properties[TelemetryProperty.CorrelationId] = Correlator.getId();
    this.connection.sendNotification(
      NotificationTypes.telemetry.sendTelemetryException,
      error,
      properties,
      measurements
    );
  }
}
