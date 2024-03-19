// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { accountLoginAzureCommand } from "./accountLoginAzure";
import { accountLoginM365Command } from "./accountLoginM365";
import * as commands from "../../resource/commands.json";

export const accountLoginCommand: CLICommand = {
  name: "login",
  description: commands["auth.login"].description,
  commands: [accountLoginM365Command, accountLoginAzureCommand],
};
