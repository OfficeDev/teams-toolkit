// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ServiceType } from "../../../../common/azure-hosting/interfaces";
import { HostTypes } from "../resources/strings";

export const runtimeMap: { [key: string]: string } = {
  js: "node",
  ts: "node",
  csharp: "dotnet",
};

export const serviceMap: { [key: string]: ServiceType } = {
  [HostTypes.APP_SERVICE]: ServiceType.AppService,
  [HostTypes.AZURE_FUNCTIONS]: ServiceType.Function,
};

export const langMap: { [key: string]: string } = {
  javascript: "js",
  typescript: "ts",
  csharp: "csharp",
};
