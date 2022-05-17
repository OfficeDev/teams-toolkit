// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ServiceType } from "../../../../common/azure-hosting/interfaces";

export const hostServiceTypeMapping: { [key: string]: ServiceType } = {
  "app-service": ServiceType.AppService,
  "azure-functions": ServiceType.Function,
};
