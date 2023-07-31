// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, err, ok } from "@microsoft/teamsfx-api";
import { MissingRequiredInputError } from "@microsoft/teamsfx-core";
import path from "path";
import { createFxCore } from "../../activate";
import { cliSource } from "../../constants";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { AadManifestPathOption, EnvOption, FolderOption } from "../common";

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
