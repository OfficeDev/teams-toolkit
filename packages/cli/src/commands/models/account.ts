// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommand } from "@microsoft/teamsfx-api";
import { accountLoginCommand } from "./accountLogin";
import { accountLogoutCommand } from "./accountLogout";
import { accountShowCommand } from "./accountShow";

export const accountCommand: CLICommand = {
  name: "account",
  description:
    "Manage cloud service accounts. The supported cloud services are 'Azure' and 'Microsoft 365'.",
  commands: [accountShowCommand, accountLoginCommand, accountLogoutCommand],
};
