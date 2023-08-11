// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, InputsWithProjectPath, err } from "@microsoft/teamsfx-api";
import { CreateEnvArguments, CreateEnvInputs, CreateEnvOptions } from "@microsoft/teamsfx-core";
import { getFxCore } from "../../activate";
import { WorkspaceNotSupported } from "../../cmds/preview/errors";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { isWorkspaceSupported } from "../../utils";
import { ProjectFolderOption } from "../common";

export const envAddCommand: CLICommand = {
  name: "add",
  description: "Add a new environment by copying from the specified environment.",
  options: [...CreateEnvOptions, ProjectFolderOption],
  arguments: CreateEnvArguments,
  telemetry: {
    event: TelemetryEvent.CreateNewEnvironment,
  },
  handler: async (ctx) => {
    const inputs = ctx.optionValues as CreateEnvInputs & InputsWithProjectPath;
    if (!isWorkspaceSupported(inputs.projectPath)) {
      return err(WorkspaceNotSupported(inputs.projectPath));
    }
    const core = getFxCore();
    const result = await core.createEnv(inputs);
    return result;
  },
};
