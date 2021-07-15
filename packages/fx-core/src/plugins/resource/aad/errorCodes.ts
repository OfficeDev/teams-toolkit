// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Constants } from "./constants";

export const GraphErrorCodes = new Map([
  [
    "Authorization_RequestDenied",
    {
      type: Constants.errorInfo.user,
      helpLink:
        "https://docs.microsoft.com/en-us/troubleshoot/azure/active-directory/authorization-request-denied-graph-api",
    },
  ],
  [
    "Directory_QuotaExceeded",
    {
      type: Constants.errorInfo.user,
      helpLink:
        "https://docs.microsoft.com/en-us/troubleshoot/azure/active-directory/exceed-number-objects-synced",
    },
  ],
  [
    "Request_ResourceNotFound",
    {
      type: Constants.errorInfo.user,
    },
  ],
]);
