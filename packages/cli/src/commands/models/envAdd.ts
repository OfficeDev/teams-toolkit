// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { err, ok } from "@microsoft/teamsfx-api";
import path from "path";
import { createFxCore } from "../../activate";
import { WorkspaceNotSupported } from "../../cmds/preview/errors";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs, isWorkspaceSupported } from "../../utils";
import { FolderOption } from "../common";
import { CLICommand } from "../types";

export const envAddCommand: CLICommand = {
  name: "add",
  description: "Add a new environment by copying from the specified environment.",
  options: [
    {
      name: "env",
      description: "Specifies an existing environment name to copy from.",
      type: "text",
      required: true,
    },
    FolderOption,
  ],
  arguments: [
    {
      name: "name",
      description: "Specifies the new environment name.",
      type: "text",
      required: true,
    },
  ],
  telemetry: {
    event: TelemetryEvent.CreateNewEnvironment,
  },
  handler: async (ctx) => {
    const projectDir = path.resolve((ctx.optionValues.folder as string) || process.cwd());

    const targetEnv = ctx.argumentValues[0] as string;
    const sourceEnv = ctx.optionValues.env as string;

    if (!isWorkspaceSupported(projectDir)) {
      return err(WorkspaceNotSupported(projectDir));
    }

    const inputs = getSystemInputs(projectDir);
    inputs.newTargetEnvName = targetEnv;
    inputs.sourceEnvName = sourceEnv;

    const core = createFxCore();
    const result = await core.createEnv(inputs);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(undefined);
  },
};
