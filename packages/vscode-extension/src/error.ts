// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";

export const ExtensionSource = "Ext";

export enum ExtensionErrors {
  UnknwonError = "UnknwonError",
  UnsupportedOperation = "UnsupportedOperation",
  UserCancel = "UserCancel",
  ConcurrentTriggerTask = "ConcurrentTriggerTask",
  EmptySelectOption = "EmptySelectOption",
  UnsupportedNodeType = "UnsupportedNodeType",
  UnknownSubscription = "UnknownSubscription",
  PortAlreadyInUse = "PortAlreadyInUse",
}
