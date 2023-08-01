// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, err, ok } from "@microsoft/teamsfx-api";
import { MissingRequiredInputError } from "@microsoft/teamsfx-core";
import path from "path";
import { createFxCore } from "../../activate";
import { cliSource } from "../../constants";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { EnvOption, RootFolderOption, TeamsManifestPathOption } from "../common";

export const updateTeamsAppCommand: CLICommand = {
  name: "teams-app",
  description: "Update the Teams App manifest to Teams Developer Portal.",
  options: [TeamsManifestPathOption, EnvOption, RootFolderOption],
  telemetry: {
    event: TelemetryEvent.UpdateTeamsApp,
  },
  handler: async (ctx) => {
    const rootFolder = path.resolve(ctx.optionValues.folder as string);
    if (!ctx.globalOptionValues.interactive && !ctx.optionValues.env) {
      return err(new MissingRequiredInputError("--env", cliSource));
    }
    const inputs = getSystemInputs(rootFolder, ctx.optionValues.env as string);
    const core = createFxCore();
    const res = await core.deployTeamsManifest(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
