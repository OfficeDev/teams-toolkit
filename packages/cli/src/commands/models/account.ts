// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommand } from "@microsoft/teamsfx-api";
import { commands } from "../../resource";
import { accountLoginCommand } from "./accountLogin";
import { accountLogoutCommand } from "./accountLogout";
import { accountShowCommand } from "./accountShow";

export const accountCommand: CLICommand = {
  name: "auth",
  aliases: ["account"],
  description: commands.auth.description,
  commands: [accountShowCommand, accountLoginCommand, accountLogoutCommand],
};
