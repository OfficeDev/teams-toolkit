// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { UserSettings } from "../../userSetttings";

export const configSetCommand: CLICommand = {
  name: "set",
  description: "Set global configuration.",
  arguments: [
    {
      name: "name",
      description: "Specifies the global configuration name.",
      type: "string",
      choices: ["telemetry", "interactive"],
      required: true,
    },
    {
      name: "value",
      description: "Specifies the global configuration value.",
      type: "string",
      required: true,
    },
  ],
  telemetry: {
    event: TelemetryEvent.CreateNewEnvironment,
  },
  defaultInteractiveOption: false,
  handler: (ctx) => {
    const configName = ctx.argumentValues[0] as string;
    const configValue = ctx.argumentValues[1] as string;
    const res = setGlobalConfig(configName, configValue);
    return res;
  },
};

export function setGlobalConfig(name: string, value: string): Result<undefined, FxError> {
  const opt = { [name]: value };
  const result = UserSettings.setConfigSync(opt);
  if (result.isErr()) {
    logger.error("Set user configuration failed.");
    return err(result.error);
  }
  logger.info(`Successfully set user configuration ${name}.`);
  return ok(undefined);
}
