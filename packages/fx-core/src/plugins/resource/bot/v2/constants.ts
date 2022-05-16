// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ServiceType } from "../../../../common/azure-hosting/interfaces";

export const languageMapping: { [key: string]: string } = {
  js: "node",
  ts: "node",
  csharp: "dotnet",
};

export const hostServiceTypeMapping: { [key: string]: ServiceType } = {
  "app-service": ServiceType.AppService,
  "azure-functions": ServiceType.Function,
};
