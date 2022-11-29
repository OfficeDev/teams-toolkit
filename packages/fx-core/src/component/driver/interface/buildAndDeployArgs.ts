// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  IProgressHandler,
  LogProvider,
  TelemetryReporter,
  UserInteraction,
} from "@microsoft/teamsfx-api";

export type Step = {
  driver: "scriptDriver" | "azureAppServiceDriver" | "azureFunctionDriver" | "azureStorageDriver";
  args: unknown;
};

export type DeployArgs = {
  workingDirectory?: string;
  distributionPath: string;
  ignoreFile?: string;
  resourceId: string;
};

export type DeployStepArgs = {
  ignoreFile?: string;
};

export type BuildArgs = {
  workingDirectory?: string;
  args: string;
};

export type DeployContext = {
  azureAccountProvider: AzureAccountProvider;
  progressBar: IProgressHandler | undefined;
  logProvider: LogProvider;
  telemetryReporter: TelemetryReporter;
};

export type AzureUploadConfig = {
  headers: {
    "Content-Type"?: string;
    "Cache-Control"?: string;
    Authorization: string;
  };
  maxContentLength: number;
  maxBodyLength: number;
  timeout: number;
};

export type AxiosOnlyStatusResult = {
  status?: number;
};

export type AxiosHeaderWithLocation = {
  headers: {
    location: string;
  };
};

export type AxiosZipDeployResult = AxiosHeaderWithLocation & AxiosOnlyStatusResult;
