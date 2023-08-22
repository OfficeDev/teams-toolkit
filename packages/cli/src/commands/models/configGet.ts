// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, FxError, Result, ok } from "@microsoft/teamsfx-api";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { UserSettings } from "../../userSetttings";

export const configGetCommand: CLICommand = {
  name: "get",
  description: "Show global configuration(s).",
  arguments: [
    {
      name: "name",
      description: "Specifies the global configuration name.",
      type: "string",
      choices: ["telemetry", "interactive"],
    },
  ],
  telemetry: {
    event: TelemetryEvent.CreateNewEnvironment,
  },
  defaultInteractiveOption: false,
  handler: (ctx) => {
    const configName = ctx.argumentValues[0] as string | undefined;
    const globalResult = printGlobalConfig(configName);
    return globalResult;
  },
};

export function printGlobalConfig(option?: string): Result<undefined, FxError> {
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
