// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessageConnection } from "vscode-jsonrpc";

import { TelemetryReporter } from "@microsoft/teamsfx-api";

import { NotificationTypes } from "../apis";

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
    this.connection.sendNotification(
      NotificationTypes.telemetry.sendTelemetryException,
      error,
      properties,
      measurements
    );
  }
}
