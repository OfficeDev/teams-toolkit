// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, ok } from "@microsoft/teamsfx-api";
import M365TokenProvider from "../../commonlib/m365Login";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { accountUtils } from "./accountShow";

export const accountLoginM365Command: CLICommand = {
  name: "m365",
  description: "Log in to Microsoft 365 account.",
  telemetry: {
    event: TelemetryEvent.AccountLoginM365,
  },
  defaultInteractiveOption: false,
  handler: async () => {
    await M365TokenProvider.signout();
    await accountUtils.outputM365Info("login");
    return ok(undefined);
  },
};
