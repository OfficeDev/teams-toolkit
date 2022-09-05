// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";

import { FxError, ok, Result, Void, LogLevel, err, UserError } from "@microsoft/teamsfx-api";

import { PackageService } from "./packageService";
import { serviceEndpoint, serviceScope } from "./serviceConstant";
import CLILogProvider from "../../commonlib/log";
import M365TokenProvider from "../../commonlib/m365Login";
import { cliSource } from "../../constants";
import { YargsCommand } from "../../yargsCommand";

/*
 * This command is in preview.
 * TODO:
 *   - retire SIDELOADING_SERVICE_ENDPOINT and SIDELOADING_SERVICE_SCOPE
 *   - e2e test
 *   - telemetry
 *   - make all wordings constants
 */

const sideloadingServiceEndpoint = process.env.SIDELOADING_SERVICE_ENDPOINT ?? serviceEndpoint;
const sideloadingServiceScope = process.env.SIDELOADING_SERVICE_SCOPE ?? serviceScope;

async function getTokenAndUpn(): Promise<[string, string]> {
  const tokenRes = await M365TokenProvider.getAccessToken({ scopes: [sideloadingServiceScope] });
  if (tokenRes.isErr()) {
    CLILogProvider.necessaryLog(
      LogLevel.Error,
      `Cannot get token. Use 'teamsfx account login m365' to log in the correct account.`
    );
    throw tokenRes.error;
  } else {
    let upn = undefined;
    try {
      // workaround to get upn via appstudio scope.
      const accountRes = await M365TokenProvider.getStatus({
        scopes: ["https://dev.teams.microsoft.com/AppDefinitions.ReadWrite"],
      });
      if (accountRes.isOk()) {
        upn = (accountRes.value.accountInfo as any).upn;
      } else {
        throw accountRes.error;
      }
    } catch (error) {
      CLILogProvider.debug(`Failed to get upn. Error: ${JSON.stringify(error)}`);
    }
    if (upn !== undefined) {
      CLILogProvider.necessaryLog(LogLevel.Info, `Using account ${upn}`);
    }
    const token = tokenRes.value;
    return [token, upn];
  }
}

class M365Sideloading extends YargsCommand {
  public readonly commandHead = "sideloading";
  public readonly command = this.commandHead;
  public readonly description =
    "Sideloading an M365 App with corresponding information specified in the given manifest package";

  builder(yargs: Argv): Argv<any> {
    yargs
      .option("file-path", {
        require: true,
        description: "Path to the App manifest zip package",
        type: "string",
      })
      .example(
        "teamsfx m365 sideloading --file-path appPackage.zip",
        "Sideloading the m365 app package"
      );
    return yargs.version(false);
  }

  async runCommand(args: { [argName: string]: string }): Promise<Result<any, FxError>> {
    CLILogProvider.necessaryLog(LogLevel.Warning, "This command is in preview.");
    const packageService = new PackageService(sideloadingServiceEndpoint);
    const manifestPath = args["file-path"];
    const tokenAndUpn = await getTokenAndUpn();
    await packageService.sideLoading(tokenAndUpn[0], manifestPath);
    return ok(Void);
  }
}

class M365Unacquire extends YargsCommand {
  public readonly commandHead = "unacquire";
  public readonly command = this.commandHead;
  public readonly description = "Remove an acquired M365 App";

  builder(yargs: Argv): Argv<any> {
    yargs
      .option("title-id", {
        require: false,
        description: "Title ID of the acquired M365 App",
        type: "string",
      })
      .option("file-path", {
        require: false,
        description: "Path to the App manifest zip package",
        type: "string",
      })
      .example(
        "teamsfx m365 unacquire --title-id U_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "Remove the acquired M365 App by Title ID"
      )
      .example(
        "teamsfx m365 unacquire --file-path appPackage.zip",
        "Remove the acquired M365 App by App Package"
      );
    return yargs.version(false);
  }

  async runCommand(args: { [argName: string]: string }): Promise<Result<any, FxError>> {
    CLILogProvider.necessaryLog(LogLevel.Warning, "This command is in preview.");

    const packageService = new PackageService(sideloadingServiceEndpoint);
    let titleId = args["title-id"];
    const manifestPath = args["file-path"];
    if (titleId === undefined && manifestPath === undefined) {
      return err(
        new UserError(
          cliSource,
          "InvalidInput",
          "Either `title-id` or `file-path` should be provided."
        )
      );
    }

    const tokenAndUpn = await getTokenAndUpn();
    if (titleId === undefined) {
      titleId = await packageService.retrieveTitleId(tokenAndUpn[0], manifestPath);
    }
    await packageService.unacquire(tokenAndUpn[0], titleId);
    return ok(Void);
  }
}

class M365LaunchInfo extends YargsCommand {
  public readonly commandHead = "launchinfo";
  public readonly command = this.commandHead;
  public readonly description = "Get launch information of an acquired M365 App";

  builder(yargs: Argv): Argv<any> {
    yargs
      .option("title-id", {
        require: false,
        description: "Title ID of the acquired M365 App",
        type: "string",
      })
      .option("file-path", {
        require: false,
        description: "Path to the App manifest zip package",
        type: "string",
      })
      .example(
        "teamsfx m365 launchinfo --title-id U_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "Get launch information of the acquired M365 App by Title ID"
      )
      .example(
        "teamsfx m365 launchinfo --file-path appPackage.zip",
        "Get launch information of the acquired M365 App by App Package"
      );
    return yargs.version(false);
  }

  async runCommand(args: { [argName: string]: string }): Promise<Result<any, FxError>> {
    CLILogProvider.necessaryLog(LogLevel.Warning, "This command is in preview.");

    const packageService = new PackageService(sideloadingServiceEndpoint);
    let titleId = args["title-id"];
    const manifestPath = args["file-path"];
    if (titleId === undefined && manifestPath === undefined) {
      return err(
        new UserError(
          cliSource,
          "InvalidInput",
          "Either `title-id` or `file-path` should be provided."
        )
      );
    }

    const tokenAndUpn = await getTokenAndUpn();
    if (titleId === undefined) {
      titleId = await packageService.retrieveTitleId(tokenAndUpn[0], manifestPath);
    }
    await packageService.getLaunchInfo(tokenAndUpn[0], titleId);
    return ok(Void);
  }
}

export default class M365 extends YargsCommand {
  public readonly commandHead = `m365`;
  public readonly command = `${this.commandHead} <action>`;
  public readonly description = "The M365 App Management.";

  public readonly subCommands: YargsCommand[] = [
    new M365Sideloading(),
    new M365Unacquire(),
    new M365LaunchInfo(),
  ];

  public builder(yargs: Argv): Argv<any> {
    yargs.options("action", {
      description: `${this.subCommands.map((cmd) => cmd.commandHead).join("|")}`,
      type: "string",
      choices: this.subCommands.map((cmd) => cmd.commandHead),
      global: false,
    });
    this.subCommands.forEach((cmd) => {
      yargs.command(
        cmd.command,
        false /*cmd.description*/,
        cmd.builder.bind(cmd),
        cmd.handler.bind(cmd)
      );
    });
    return yargs.version(false);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
