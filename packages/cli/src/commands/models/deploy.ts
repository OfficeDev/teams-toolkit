// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, err, ok } from "@microsoft/teamsfx-api";
import { assign } from "lodash";
import { createFxCore } from "../../activate";
import { strings } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { EnvOption, FolderOption } from "../common";

export const deployCommand: CLICommand = {
  name: "deploy",
  description: strings.command.deploy.description,
  options: [EnvOption, FolderOption],
  telemetry: {
    event: TelemetryEvent.Deploy,
  },
  handler: async (ctx: CLIContext) => {
    const projectPath = ctx.optionValues.folder as string;
    const core = createFxCore();
    const inputs = getSystemInputs(projectPath);
    if (!ctx.globalOptionValues.interactive) {
      assign(inputs, ctx.optionValues);
    }
    const res = await core.deployArtifacts(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
