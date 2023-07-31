// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, ok } from "@microsoft/teamsfx-api";
import M365TokenProvider from "../../commonlib/m365Login";
import { outputM365Info } from "../../cmds/account";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";

export const accountLoginM365Command: CLICommand = {
  name: "m365",
  description: "Log in to Microsoft 365.",
  telemetry: {
    event: TelemetryEvent.AccountLoginM365,
  },
  handler: async (ctx) => {
    await M365TokenProvider.signout();
    await outputM365Info("login");
    return ok(undefined);
  },
};
