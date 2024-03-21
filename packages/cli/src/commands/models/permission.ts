// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { commands } from "../../resource";
import { permissionGrantCommand } from "./permissionGrant";
import { permissionStatusCommand } from "./permissionStatus";

export const permissionCommand: CLICommand = {
  name: "collaborator",
  aliases: ["permission"],
  description: commands.collaborator.description,
  commands: [permissionStatusCommand, permissionGrantCommand],
};
