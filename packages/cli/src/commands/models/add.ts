// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { addSPFxWebpartCommand } from "./addSPFxWebpart";

export const addCommand: CLICommand = {
  name: "add",
  description: "Add feature to your Microsoft Teams application.",
  commands: [addSPFxWebpartCommand],
};
