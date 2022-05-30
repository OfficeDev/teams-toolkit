// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum ServiceType {
  AppService = "webapp",
  Functions = "botFunction",
  BotService = "botservice",
}

export type BicepConfigs = string[];

export type BicepContext = { plugins: string[]; configs: BicepConfigs };

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

export type AzurePublishingCredentials = {
  publishingUserName?: string;
  publishingPassword?: string;
} & AxiosResponseWithStatusResult;

export type AxiosOnlyStatusResult = {
  status?: number;
};

export type AxiosResponseWithStatusResult = {
  _response: {
    status: number;
  };
};

export type AxiosHeaderWithLocation = {
  headers: {
    location: string;
  };
};

export type AxiosZipDeployResult = AxiosHeaderWithLocation & AxiosOnlyStatusResult;

export interface Logger {
  debug?: (message: string) => void;
  info?: (message: string) => void;
  warning?: (message: string) => void;
  error?: (message: string) => void;
}
