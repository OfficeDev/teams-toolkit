// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, ok } from "@microsoft/teamsfx-api";
import M365TokenProvider from "../../commonlib/m365Login";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { accountUtils } from "./accountShow";
import * as commands from "../../resource/commands.json";

export const accountLoginM365Command: CLICommand = {
  name: "m365",
  description: commands["auth.login.m365"].description,
  telemetry: {
    event: TelemetryEvent.AccountLoginM365,
  },
  handler: async () => {
    await M365TokenProvider.signout();
    await accountUtils.outputM365Info("login");
    return ok(undefined);
  },
};
