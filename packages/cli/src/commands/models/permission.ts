// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "../types";
import { permissionStatusCommand } from "./permissionStatus";
import { permissionGrantCommand } from "./permissionGrant";

export const permissionCommand: CLICommand = {
  name: "permission",
  description: "Check, grant and list user permission.",
  commands: [permissionStatusCommand, permissionGrantCommand],
};
