// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, ok } from "@microsoft/teamsfx-api";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getTemplates } from "../../utils";

export const listSamplesCommand: CLICommand = {
  name: "samples",
  description: "List all Teams App samples.",
  handler: async (cmd) => {
    logger.info("The following are sample apps:");
    const samples = await getTemplates();
    logger.info(JSON.stringify(samples, undefined, 2));
    return ok(undefined);
  },
  telemetry: {
    event: TelemetryEvent.ListSample,
  },
};
