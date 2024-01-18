// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, ok } from "@microsoft/teamsfx-api";
import { envUtil } from "@microsoft/teamsfx-core";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { EnvFileOption, EnvOption, IgnoreKeysOption, ProjectFolderOption } from "../common";

export const envResetCommand: CLICommand = {
  name: "reset",
  description: "Reset an environment or an environment file.",
  options: [EnvOption, EnvFileOption, IgnoreKeysOption, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.ResetEnvironment,
  },
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    const inputs = ctx.optionValues;
    if (inputs.env) {
      await envUtil.resetEnv(
        inputs.projectPath as string,
        inputs.env as string,
        (inputs["ignore-keys"] as string[]) || []
      );
    } else if (inputs["env-file"]) {
      await envUtil.resetEnvFile(
        inputs["env-file"] as string,
        (inputs["ignore-keys"] as string[]) || []
      );
    }
    return ok(undefined);
  },
};
