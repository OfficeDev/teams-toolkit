// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, ok } from "@microsoft/teamsfx-api";
import AzureTokenProvider from "../../commonlib/azureLogin";
import { logger } from "../../commonlib/logger";
import M365TokenProvider from "../../commonlib/m365Login";
import { cliSource } from "../../constants";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";

export const accountLogoutCommand: CLICommand = {
  name: "logout",
  description: "Log out of the selected cloud service.",
  arguments: [
    {
      type: "string",
      name: "service",
      description: "Azure or Microsoft 365.",
      choices: ["azure", "m365"],
      required: true,
    },
  ],
  telemetry: {
    event: TelemetryEvent.AccountLogout,
  },
  handler: async (ctx) => {
    const service = ctx.argumentValues[0];
    switch (service) {
      case "azure": {
        ctx.telemetryProperties.service = "azure";
        const result = await AzureTokenProvider.signout();
        if (result) {
          logger.info(`[${cliSource}] Successfully signed out of Azure.`);
        } else {
          logger.error(`[${cliSource}] Failed to sign out of Azure.`);
        }
        break;
      }
      case "m365": {
        ctx.telemetryProperties.service = "m365";
        const result = await M365TokenProvider.signout();
        if (result) {
          logger.info(`[${cliSource}] Successfully signed out of Microsoft 365.`);
        } else {
          logger.error(`[${cliSource}] Failed to sign out of Microsoft 365.`);
        }
        break;
      }
    }
    return ok(undefined);
  },
};
