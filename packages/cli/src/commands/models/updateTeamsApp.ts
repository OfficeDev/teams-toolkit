// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, err, ok } from "@microsoft/teamsfx-api";
import { SelectTeamsManifestOptions } from "@microsoft/teamsfx-core";
import { assign } from "lodash";
import { createFxCore } from "../../activate";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { EnvOption, ProjectFolderOption } from "../common";

export const updateTeamsAppCommand: CLICommand = {
  name: "teams-app",
  description: "Update the Teams App manifest to Teams Developer Portal.",
  options: [...SelectTeamsManifestOptions, EnvOption, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.UpdateTeamsApp,
  },
  handler: async (ctx) => {
    const inputs = getSystemInputs();
    assign(inputs, ctx.optionValues);
    const core = createFxCore();
    const res = await core.deployTeamsManifest(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
