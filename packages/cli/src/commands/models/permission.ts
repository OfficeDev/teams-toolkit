// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { permissionGrantCommand } from "./permissionGrant";
import { permissionStatusCommand } from "./permissionStatus";

export const permissionCommand: CLICommand = {
  name: "collaborator",
  aliases: ["permission"],
  description:
    "Check, grant and list permissions for who can access and manage Microsoft Teams application and Microsoft Entra application.",
  commands: [permissionStatusCommand, permissionGrantCommand],
};
