// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { permissionGrantCommand } from "./permissionGrant";
import { permissionStatusCommand } from "./permissionStatus";
import { isCliV3Enabled } from "@microsoft/teamsfx-core";

export const permissionCommand: CLICommand = {
  name: isCliV3Enabled() ? "collaborator" : "permission",
  aliases: isCliV3Enabled() ? ["permission"] : ["collaborator"],
  description:
    "Check, grant and list permissions for who can access and manage Microsoft Teams application and Microsoft Entra application.",
  commands: [permissionStatusCommand, permissionGrantCommand],
};
