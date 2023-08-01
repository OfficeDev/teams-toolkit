// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, ok } from "@microsoft/teamsfx-api";
import { CapabilityOptions } from "@microsoft/teamsfx-core";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";

export const listCapabilitiesCommand: CLICommand = {
  name: "capabilities",
  description: "List all Teams App tempalte capabilities.",
  handler: async (cmd) => {
    logger.info("The following are Teams App tempalte capabilities:");
    const list = CapabilityOptions.all();
    logger.info(JSON.stringify(list, undefined, 2));
    return ok(undefined);
  },
  telemetry: {
    event: TelemetryEvent.ListSample,
  },
};
