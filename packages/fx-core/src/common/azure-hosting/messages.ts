// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class Messages {
  static deploy = (endpoint: string, bytes: number): string =>
    `Successfully deploy to endpoint ${endpoint}: ${bytes} bytes`;
  static restartFunction = (siteName: string): string =>
    `Restarting Azure Function App ${siteName}.`;

  static deployFailed = (status: number): string =>
    `Deployment is failed with error code: ${status}.`;
  static zipDeploy = "Uploading application package.";
}
