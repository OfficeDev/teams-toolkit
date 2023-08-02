// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";

import { FxError, LogLevel, Result, UserError, Void, err, ok } from "@microsoft/teamsfx-api";
import { PackageService, serviceEndpoint, serviceScope } from "@microsoft/teamsfx-core";

import CLILogProvider from "../../commonlib/log";
import M365TokenProvider from "../../commonlib/m365Login";
import { CLILogLevel, cliSource } from "../../constants";
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

export async function getTokenAndUpn(): Promise<[string, string]> {
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
    if (CLILogProvider.getLogLevel() === CLILogLevel.error) {
      CLILogProvider.setLogLevel(CLILogLevel.verbose);
    }
    CLILogProvider.necessaryLog(LogLevel.Warning, "This command is in preview.");

    const packageService = new PackageService(sideloadingServiceEndpoint, CLILogProvider);
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
      .option("manifest-id", {
        require: false,
        description: "Manifest ID of the acquired M365 App",
        type: "string",
      })
      .example(
        "teamsfx m365 unacquire --title-id U_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "Remove the acquired M365 App by Title ID"
      )
      .example(
        "teamsfx m365 unacquire --manifest-id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "Remove the acquired M365 App by Manifest ID"
      );
    return yargs.version(false);
  }

  async runCommand(args: { [argName: string]: string }): Promise<Result<any, FxError>> {
    if (CLILogProvider.getLogLevel() === CLILogLevel.error) {
      CLILogProvider.setLogLevel(CLILogLevel.verbose);
    }
    CLILogProvider.necessaryLog(LogLevel.Warning, "This command is in preview.");

    const packageService = new PackageService(sideloadingServiceEndpoint, CLILogProvider);
    let titleId = args["title-id"];
    const manifestId = args["manifest-id"];
    if (titleId === undefined && manifestId === undefined) {
      return err(
        new UserError(
          cliSource,
          "InvalidInput",
          "Either `title-id` or `manifest-id` should be provided."
        )
      );
    }

    const tokenAndUpn = await getTokenAndUpn();
    if (titleId === undefined) {
      titleId = await packageService.retrieveTitleId(tokenAndUpn[0], manifestId);
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
      .option("manifest-id", {
        require: false,
        description: "Manifest ID of the acquired M365 App",
        type: "string",
      })
      .example(
        "teamsfx m365 launchinfo --title-id U_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "Get launch information of the acquired M365 App by Title ID"
      )
      .example(
        "teamsfx m365 launchinfo --manifest-id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "Get launch information of the acquired M365 App by Manifest ID"
      );
    return yargs.version(false);
  }

  async runCommand(args: { [argName: string]: string }): Promise<Result<any, FxError>> {
    if (CLILogProvider.getLogLevel() === CLILogLevel.error) {
      CLILogProvider.setLogLevel(CLILogLevel.verbose);
    }
    CLILogProvider.necessaryLog(LogLevel.Warning, "This command is in preview.");

    const packageService = new PackageService(sideloadingServiceEndpoint, CLILogProvider);
    let titleId = args["title-id"];
    const manifestId = args["manifest-id"];
    if (titleId === undefined && manifestId === undefined) {
      return err(
        new UserError(
          cliSource,
          "InvalidInput",
          "Either `title-id` or `manifest-id` should be provided."
        )
      );
    }

    const tokenAndUpn = await getTokenAndUpn();
    if (titleId === undefined) {
      titleId = await packageService.retrieveTitleId(tokenAndUpn[0], manifestId);
    }
    await packageService.getLaunchInfoByTitleId(tokenAndUpn[0], titleId);
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
