// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommand } from "@microsoft/teamsfx-api";
import { accountLoginCommand } from "./accountLogin";
import { accountLogoutCommand } from "./accountLogout";
import { accountShowCommand } from "./accountShow";

export const accountCommand: CLICommand = {
  name: "account",
  description: "Manage Microsoft 365 and Azure accounts.",
  commands: [accountShowCommand, accountLoginCommand, accountLogoutCommand],
};
