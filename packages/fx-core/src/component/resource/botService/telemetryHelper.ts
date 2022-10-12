// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TelemetryKeys } from "./constants";

export class TelemetryHelper {
  static fillAppStudioErrorProperty(
    innerError: any | undefined,
    properties: { [key: string]: string }
  ): void {
    const url = innerError?.teamsfxUrlName as string;
    if (!url) {
      return;
    }

    properties[TelemetryKeys.Url] = url;
    const statusCode = `${innerError?.response?.status}`;
    if (statusCode) {
      properties[TelemetryKeys.StatusCode] = statusCode;
    }

    const method = innerError?.toJSON?.()?.config?.method;
    if (method) {
      properties[TelemetryKeys.Method] = method;
    }
  }
}
