// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { TelemetryReporter } from "fx-api";

export class MockTelemetry implements TelemetryReporter {
  private static instance: MockTelemetry;
  private constructor() {}

  public static getInstance(): MockTelemetry {
    if (!MockTelemetry.instance) {
      MockTelemetry.instance = new MockTelemetry();
    }

    return MockTelemetry.instance;
  }

  sendTelemetryEvent(
    eventName: string,
    properties?: {
      [key: string]: string;
    },
    measurements?: {
      [key: string]: number;
    }
  ): void {}

  sendTelemetryErrorEvent(
    eventName: string,
    properties?: {
      [key: string]: string;
    },
    measurements?: {
      [key: string]: number;
    },
    errorProps?: string[]
  ): void {}

  sendTelemetryException(
    error: Error,
    properties?: {
      [key: string]: string;
    },
    measurements?: {
      [key: string]: number;
    }
  ): void {}
}
