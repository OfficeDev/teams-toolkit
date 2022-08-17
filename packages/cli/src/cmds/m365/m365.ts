// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import axios from "axios";
import fs from "fs-extra";
import { Argv } from "yargs";

import { FxError, ok, Result, Void, LogLevel } from "@microsoft/teamsfx-api";

import { serviceEndpoint, serviceScope } from "./serviceConstant";
import CLILogProvider from "../../commonlib/log";
import M365TokenProvider from "../../commonlib/m365Login";
import { YargsCommand } from "../../yargsCommand";

/*
 * This command is in preview.
 * TODO:
 *   - sideloading
 *   - e2e test
 *   - telemetry
 *   - make all wordings constants
 */

async function getTokenAndUpn(): Promise<[string, string]> {
  const tokenRes = await M365TokenProvider.getAccessToken({ scopes: [serviceScope] });
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

async function sideLoading(baseUrl: string, token: string, manifestPath: string): Promise<void> {
  await fs.readFile(manifestPath);
  const instance = axios.create({
    baseURL: baseUrl,
    timeout: 30000,
  });
  instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  try {
    // TODO: add sideloading API calls
    await instance.get("/");
    CLILogProvider.necessaryLog(LogLevel.Info, "Sideloading done.");
  } catch (error: any) {
    CLILogProvider.necessaryLog(LogLevel.Error, "Sideloading failed.");
    if (error.response) {
      CLILogProvider.necessaryLog(LogLevel.Error, JSON.stringify(error.response.data));
    } else {
      CLILogProvider.necessaryLog(LogLevel.Error, error.message);
    }
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

    const manifestPath = args["file-path"];
    const tokenAndUpn = await getTokenAndUpn();
    await sideLoading(serviceEndpoint, tokenAndUpn[0], manifestPath);
    return ok(Void);
  }
}

export default class M365 extends YargsCommand {
  public readonly commandHead = `m365`;
  public readonly command = `${this.commandHead} <action>`;
  public readonly description = "The M365 App Management.";

  public readonly subCommands: YargsCommand[] = [new M365Sideloading()];

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
