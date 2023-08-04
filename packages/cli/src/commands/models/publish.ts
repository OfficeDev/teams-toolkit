// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { assign } from "lodash";
import { createFxCore } from "../../activate";
import { strings } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { EnvOption, ProjectFolderOption } from "../common";

export const publishCommand: CLICommand = {
  name: "publish",
  description: strings.command.publish.description,
  options: [EnvOption, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.Publish,
  },
  handler: async (ctx: CLIContext) => {
    const inputs = ctx.optionValues as InputsWithProjectPath;
    const core = createFxCore();
    if (!ctx.globalOptionValues.interactive) {
      assign(inputs, ctx.optionValues);
    }
    const res = await core.publishApplication(inputs);
    return res;
  },
};
