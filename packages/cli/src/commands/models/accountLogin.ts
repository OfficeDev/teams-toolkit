// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { accountLoginAzureCommand } from "./accountLoginAzure";
import { accountLoginM365Command } from "./accountLoginM365";

export const accountLoginCommand: CLICommand = {
  name: "login",
  description: "Log in to Microsoft 365 or Azure account.",
  commands: [accountLoginM365Command, accountLoginAzureCommand],
};
