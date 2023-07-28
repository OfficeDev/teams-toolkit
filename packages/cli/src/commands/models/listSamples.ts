// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogLevel, ok } from "@microsoft/teamsfx-api";
import CLILogProvider from "../../commonlib/log";
import { templates } from "../../constants";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { CliCommand, CliContext } from "../types";

export const listSampleCommandModel: CliCommand = {
  name: "list",
  description: "List all Teams App samples.",
  handler: async (cmd: CliContext) => {
    CLILogProvider.necessaryLog(LogLevel.Info, `The following are sample apps:`);
    CLILogProvider.necessaryLog(LogLevel.Info, JSON.stringify(templates, undefined, 4), true);
    return ok(undefined);
  },
  telemetry: {
    event: TelemetryEvent.ListSample,
  },
};
