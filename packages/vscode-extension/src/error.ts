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
  PortAlreadyInUse = "PortAlreadyInUse"
}

export const NoProjectOpenedError = new UserError(
  "NoProjectOpened",
  "No project opened, you can create a new project or open an existing one.",
  ExtensionSource
);

export const InvalidProject = new UserError(
  "InvalidProject",
  "The project type is invalid",
  ExtensionSource
);
