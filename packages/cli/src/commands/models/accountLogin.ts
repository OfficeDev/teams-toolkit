// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { accountLoginAzureCommand } from "./accountLoginAzure";
import { accountLoginM365Command } from "./accountLoginM365";

export const accountLoginCommand: CLICommand = {
  name: "login",
  description: "Log in to the selected cloud service.",
  commands: [accountLoginM365Command, accountLoginAzureCommand],
};
