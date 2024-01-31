// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { updateAadAppCommand } from "./updateAadApp";
import { updateTeamsAppCommand } from "./updateTeamsApp";

export const updateCommand: CLICommand = {
  name: "update",
  description: "Update the specific application manifest file.",
  commands: [updateAadAppCommand, updateTeamsAppCommand],
};
