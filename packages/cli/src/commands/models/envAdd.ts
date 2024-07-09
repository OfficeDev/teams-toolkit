// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, InputsWithProjectPath, err } from "@microsoft/teamsfx-api";
import {
  CreateEnvArguments,
  CreateEnvInputs,
  CreateEnvOptions,
  isValidProjectV3,
} from "@microsoft/teamsfx-core";
import { getFxCore } from "../../activate";
import { WorkspaceNotSupported } from "../../cmds/preview/errors";
import { commands } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { ProjectFolderOption } from "../common";

export const envAddCommand: CLICommand = {
  name: "add",
  description: commands["env.add"].description,
  options: [...CreateEnvOptions, ProjectFolderOption],
  arguments: CreateEnvArguments,
  telemetry: {
    event: TelemetryEvent.CreateNewEnvironment,
  },
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    const inputs = ctx.optionValues as CreateEnvInputs & InputsWithProjectPath;
    if (!isValidProjectV3(inputs.projectPath)) {
      return err(WorkspaceNotSupported(inputs.projectPath));
    }
    const core = getFxCore();
    const result = await core.createEnv(inputs);
    return result;
  },
};
