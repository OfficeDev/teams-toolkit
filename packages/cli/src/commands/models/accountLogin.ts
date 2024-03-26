// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { commands } from "../../resource";
import { accountLoginAzureCommand } from "./accountLoginAzure";
import { accountLoginM365Command } from "./accountLoginM365";

export const accountLoginCommand: CLICommand = {
  name: "login",
  description: commands["auth.login"].description,
  commands: [accountLoginM365Command, accountLoginAzureCommand],
};
