// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, Platform, err, ok } from "@microsoft/teamsfx-api";
import { PackageService, UninstallInputs } from "@microsoft/teamsfx-core";
import { logger } from "../../commonlib/logger";
import { MissingRequiredOptionError } from "../../error";
import { commands } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { m365utils, sideloadingServiceEndpoint } from "./m365Sideloading";
import { getFxCore } from "../../activate";

export const m365UnacquireCommand: CLICommand = {
  name: "uninstall",
  aliases: ["unacquire"],
  description: commands.uninstall.description,
  options: [
    {
      name: "title-id",
      description: commands.uninstall.options["title-id"],
      type: "string",
    },
    {
      name: "manifest-id",
      description: commands.uninstall.options["manifest-id"],
      type: "string",
    },
    {
      name: "env",
      description: commands.uninstall.options["env"],
      type: "string",
    },
  ],
  examples: [
    {
      command: `${process.env.TEAMSFX_CLI_BIN_NAME} uninstall --title-id U_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
      description: "Remove the acquired M365 App by Title ID",
    },
    {
      command: `${process.env.TEAMSFX_CLI_BIN_NAME} uninstall --manifest-id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx -i false --m365-app --app-refistration --bot-framework-registration`,
      description: "Remove the acquired M365 App by Manifest ID",
    },
    {
      command: `${process.env.TEAMSFX_CLI_BIN_NAME} uninstall --env xxx -i false --m365-app --app-refistration --bot-framework-registration`,
      description: "Remove the acquired M365 App by local env",
    },
  ],
  telemetry: {
    event: TelemetryEvent.M365Unacquire,
  },
  defaultInteractiveOption: true,
  handler: async (ctx) => {
    const inputs = ctx.optionValues as UninstallInputs;
    const core = getFxCore();
    const res = await core.uninstall(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
    //const packageService = new PackageService(sideloadingServiceEndpoint, logger);
    //let titleId = ctx.optionValues["title-id"] as string;
    //const manifestId = ctx.optionValues["manifest-id"] as string;
    //const env = ctx.optionValues["env"] as string;
    //if (titleId === undefined && manifestId === undefined && env === undefined) {
    //  return err(
    //    new MissingRequiredOptionError(ctx.command.fullName, `--title-id or --manifest-id or --env`)
    //  );
    //}
    //// todo: set manifest Id if not provided
    //const tokenAndUpn = await m365utils.getTokenAndUpn();
    //if (titleId === undefined) {
    //  titleId = await packageService.retrieveTitleId(tokenAndUpn[0], manifestId);
    //}
    //await packageService.unacquire(tokenAndUpn[0], titleId);
    //return ok(undefined);
  },
};
