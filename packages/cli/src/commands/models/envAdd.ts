// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, err, ok } from "@microsoft/teamsfx-api";
import path from "path";
import { createFxCore } from "../../activate";
import { WorkspaceNotSupported } from "../../cmds/preview/errors";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs, isWorkspaceSupported } from "../../utils";
import { CreateEnvArguments, CreateEnvInputs, CreateEnvOptions } from "@microsoft/teamsfx-core";
import { ProjectFolderOption } from "../common";
import { assign } from "lodash";

export const envAddCommand: CLICommand = {
  name: "add",
  description: "Add a new environment by copying from the specified environment.",
  options: [...CreateEnvOptions, ProjectFolderOption],
  arguments: CreateEnvArguments,
  telemetry: {
    event: TelemetryEvent.CreateNewEnvironment,
  },
  handler: async (ctx) => {
    const options = ctx.optionValues as CreateEnvInputs;
    const projectDir = options.projectPath || process.cwd();
    options.newTargetEnvName = ctx.argumentValues[0];
    if (!isWorkspaceSupported(projectDir)) {
      return err(WorkspaceNotSupported(projectDir));
    }

    const inputs = getSystemInputs(projectDir);
    assign(inputs, options);

    const core = createFxCore();
    const result = await core.createEnv(inputs);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(undefined);
  },
};
