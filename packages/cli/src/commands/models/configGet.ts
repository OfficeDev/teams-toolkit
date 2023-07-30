// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, Result, ok } from "@microsoft/teamsfx-api";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { UserSettings } from "../../userSetttings";
import { CLICommand } from "../types";

export const configGetCommand: CLICommand = {
  name: "get",
  description: "Show global configuration(s).",
  arguments: [
    {
      name: "name",
      description: "Specifies the global configuration name.",
      type: "singleSelect",
      choices: ["telemetry", "interactive"],
    },
  ],
  telemetry: {
    event: TelemetryEvent.CreateNewEnvironment,
  },
  handler: async (ctx) => {
    const configName = ctx.argumentValues[0] as string;
    if (configName === undefined) {
      const globalResult = await printGlobalConfig();
      if (globalResult.isErr()) {
        return globalResult;
      }
    } else {
      const globalResult = await printGlobalConfig(configName);
      if (globalResult.isErr()) {
        return globalResult;
      }
    }
    return ok(undefined);
  },
};

async function printGlobalConfig(option?: string): Promise<Result<undefined, FxError>> {
  const result = UserSettings.getConfigSync();
  if (result.isErr()) {
    return result;
  }
  const config = result.value;
  if (option) {
    logger.info(JSON.stringify(config[option], null, 2));
  } else {
    logger.info(JSON.stringify(config, null, 2));
  }
  return ok(undefined);
}
