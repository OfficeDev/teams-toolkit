// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { MissingRequiredInputError } from "@microsoft/teamsfx-core";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { AadManifestPathOption, EnvOption, FolderOption } from "../common";
import { CLICommand } from "../types";
import { cliSource } from "../../constants";
import { err, ok } from "@microsoft/teamsfx-api";
import path from "path";
import { getSystemInputs } from "../../utils";
import { createFxCore } from "../../activate";

export const updateAadAppCommand: CLICommand = {
  name: "aad-app",
  description: "Update the AAD App in the current application.",
  options: [AadManifestPathOption, EnvOption, FolderOption],
  telemetry: {
    event: TelemetryEvent.UpdateAadApp,
  },
  handler: async (ctx) => {
    const rootFolder = path.resolve(ctx.optionValues.folder as string);
    if (!ctx.globalOptionValues.interactive && !ctx.optionValues.env) {
      return err(new MissingRequiredInputError("--env", cliSource));
    }
    const inputs = getSystemInputs(rootFolder, ctx.optionValues.env as string);
    inputs.ignoreEnvInfo = false;
    const core = createFxCore();
    const res = await core.deployAadManifest(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
