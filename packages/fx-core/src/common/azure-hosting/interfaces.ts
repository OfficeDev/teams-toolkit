// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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

export interface Logger {
  debug?: (message: string) => void;
  info?: (message: string) => void;
  warning?: (message: string) => void;
  error?: (message: string) => void;
}
