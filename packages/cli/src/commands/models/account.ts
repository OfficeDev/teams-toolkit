// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommand } from "@microsoft/teamsfx-api";
import { accountLoginCommand } from "./accountLogin";
import { accountLogoutCommand } from "./accountLogout";
import { accountShowCommand } from "./accountShow";
import { isCliV3Enabled } from "@microsoft/teamsfx-core";

export const accountCommand: CLICommand = {
  name: isCliV3Enabled() ? "auth" : "account",
  aliases: isCliV3Enabled() ? ["account"] : ["auth"],
  description: "Manage Microsoft 365 and Azure accounts.",
  commands: [accountShowCommand, accountLoginCommand, accountLogoutCommand],
};
