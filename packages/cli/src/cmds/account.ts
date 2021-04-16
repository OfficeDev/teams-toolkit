// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";

import { FxError, ok, Result } from "fx-api";

import { YargsCommand } from "../yargsCommand";
import AppStudioTokenProvider from "../commonlib/appStudioLogin";
import AzureTokenProvider from "../commonlib/azureLogin";
import CLILogProvider from "../commonlib/log";
import * as constants from "../constants";

class LoginAccount extends YargsCommand {
  public readonly commandHead = `login`;
  public readonly command = `${this.commandHead} <platform> [options]`;
  public readonly description = "A command to login some platform";

  public builder(yargs: Argv): Argv<any> {
    return yargs.positional("platform", {
      description: "Azure|M365",
      type: "string",
      choices: ["azure", "m365"]
    });
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    switch (args.platform) {
      case "azure": {
        const result = await AzureTokenProvider.getAccountCredentialAsync();
        CLILogProvider.debug(
          `[${constants.cliSource}] Azure Account Credential: ${JSON.stringify(result, null, 4)}`
        );
        break;
      }
      case "m365": {
        const result = await AppStudioTokenProvider.getJsonObject();
        CLILogProvider.debug(
          `[${constants.cliSource}] M365 (App Studio) Token: ${JSON.stringify(result, null, 4)}`
        );
        break;
      }
    }
    return ok(null);
  }
}

class LogoutAccount extends YargsCommand {
  public readonly commandHead = `logout`;
  public readonly command = `${this.commandHead} <platform>`;
  public readonly description = "A command to logout some platform";

  public builder(yargs: Argv): Argv<any> {
    return yargs.positional("platform", {
      description: "Azure|M365",
      type: "string",
      choices: ["azure", "m365"]
    });
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    switch (args.platform) {
      case "azure": {
        const result = await AzureTokenProvider.signout();
        CLILogProvider.debug(`[${constants.cliSource}] Azure Account logout: ${result}`);
        break;
      }
      case "m365": {
        const result = await AppStudioTokenProvider.signout();
        CLILogProvider.debug(`[${constants.cliSource}] M365 (App Studio) logout: ${result}`);
        break;
      }
    }
    return ok(null);
  }
}

class SetAccount extends YargsCommand {
  public readonly commandHead = `set`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to set account settings such as 'set subscription id'.";

  public builder(yargs: Argv): Argv<any> {
    return yargs
      .options("folder", {
        description: "Select root folder of the project",
        type: "string",
        default: "./"
      })
      .options("subscription", {
        description: "subscription id",
        type: "string"
      });
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    if ("subscription" in args && !!args.subscription) {
      return AzureTokenProvider.setSubscriptionId(args.subscription, args.folder);
    }
    return ok(null);
  }
}

export default class Account extends YargsCommand {
  public readonly commandHead = `account`;
  public readonly command = `${this.commandHead} <action> [options]`;
  public readonly description = "login/logout some platform || set some account setting";

  public readonly subCommands: YargsCommand[] = [
    new LoginAccount(),
    new LogoutAccount(),
    new SetAccount()
  ];

  public builder(yargs: Argv): Argv<any> {
    yargs.options("action", {
      description: "login|logout|set",
      type: "string",
      choices: ["login", "logout", "set"]
    });
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs.version(false);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
