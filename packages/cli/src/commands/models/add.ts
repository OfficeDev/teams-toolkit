// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { commands } from "../../resource";
import { addSPFxWebpartCommand } from "./addSPFxWebpart";
export const addCommand: CLICommand = {
  name: "add",
  description: commands.add.description,
  commands: [addSPFxWebpartCommand],
};
