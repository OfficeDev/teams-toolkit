// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, err, ok } from "@microsoft/teamsfx-api";
import { assign } from "lodash";
import path from "path";
import { createFxCore } from "../../activate";
import { strings } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { EnvOption, ProjectFolderOption } from "../common";

export const provisionCommand: CLICommand = {
  name: "provision",
  description: strings.command.provision.description,
  options: [EnvOption, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.Provision,
  },
  handler: async (ctx: CLIContext) => {
    const projectPath = path.resolve((ctx.optionValues.folder as string) || "./");
    const core = createFxCore();
    const inputs = getSystemInputs(projectPath);
    if (!ctx.globalOptionValues.interactive) {
      assign(inputs, ctx.optionValues);
    }
    const res = await core.provisionResources(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
