// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Constants } from "../constants";

export function getPermissionErrorMessage(
  message: string,
  isGrantPermission = false,
  objectId?: string
): string {
  return isGrantPermission
    ? `${Constants.permissions.name}: ${objectId}. Error: ${message}`
    : message;
}
