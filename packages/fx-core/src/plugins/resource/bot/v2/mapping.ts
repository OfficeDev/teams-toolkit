// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ServiceType } from "../../../../common/azure-hosting/interfaces";

export const runtimeMap: { [key: string]: string } = {
  js: "node",
  ts: "node",
  csharp: "dotnet",
};

export const serviceMap: { [key: string]: ServiceType } = {
  "app-service": ServiceType.AppService,
  "azure-functions": ServiceType.Functions,
};

export const langMap: { [key: string]: string } = {
  javascript: "js",
  typescript: "ts",
  csharp: "csharp",
};
