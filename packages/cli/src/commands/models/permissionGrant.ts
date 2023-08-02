// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, err, ok } from "@microsoft/teamsfx-api";
import { CoreQuestionNames } from "@microsoft/teamsfx-core";
import { assign } from "lodash";
import path from "path";
import { createFxCore } from "../../activate";
import { azureMessage, setAppTypeInputs, spfxMessage } from "../../cmds/permission";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { EnvOption, RootFolderOption } from "../common";

export const permissionGrantCommand: CLICommand = {
  name: "grant",
  description: "Grant permission for another account.",
  options: [
    {
      name: "email",
      description: "Email address of the collaborator.",
      type: "string",
    },
    {
      name: "teams-app-manifest",
      type: "string",
      description: "Manifest of Your Teams app.",
    },
    {
      name: "aad-app-manifest",
      type: "string",
      description: "Manifest of your Azure AD app.",
    },
    EnvOption,
    RootFolderOption,
  ],
  telemetry: {
    event: TelemetryEvent.GrantPermission,
  },
  handler: async (ctx) => {
    const rootFolder = path.resolve((ctx.optionValues.folder as string) || "./");
    const inputs = getSystemInputs(rootFolder);
    if (!ctx.globalOptionValues.interactive) {
      assign(inputs, ctx.optionValues);
    }
    // print necessary messages
    logger.info(azureMessage);
    logger.info(spfxMessage);

    // add user input to Inputs
    inputs[CoreQuestionNames.AadAppManifestFilePath] = ctx.optionValues["aad-app-manifest"];
    inputs[CoreQuestionNames.TeamsAppManifestFilePath] = ctx.optionValues["teams-app-manifest"];
    inputs["env"] = ctx.optionValues["env"] + "";
    setAppTypeInputs(inputs);
    const core = createFxCore();
    const result = await core.grantPermission(inputs);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(undefined);
  },
};
