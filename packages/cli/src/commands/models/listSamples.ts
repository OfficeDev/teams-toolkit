// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ok } from "@microsoft/teamsfx-api";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getTemplates } from "../../utils";
import { CLICommand, CLIContext } from "../types";

export const listSampleCommand: CLICommand = {
  name: "list",
  description: "List all Teams App samples.",
  handler: async (cmd: CLIContext) => {
    logger.info("The following are sample apps:");
    const samples = await getTemplates();
    logger.info(JSON.stringify(samples, undefined, 4));
    return ok(undefined);
  },
  telemetry: {
    event: TelemetryEvent.ListSample,
  },
};
