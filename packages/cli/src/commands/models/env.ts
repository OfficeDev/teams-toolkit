// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { commands } from "../../resource";
import { envAddCommand } from "./envAdd";
import { envListCommand } from "./envList";
import { envResetCommand } from "./envReset";

export const envCommand: CLICommand = {
  name: "env",
  description: commands.env.description,
  commands: [envAddCommand, envListCommand, envResetCommand],
};
