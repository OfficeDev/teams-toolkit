// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import colors from "colors";
import { Argv } from "yargs";

import { FxError, ok, Question, Result } from "fx-api";

import { YargsCommand } from "../yargsCommand";
import AppStudioTokenProvider from "../commonlib/appStudioLogin";
import AzureTokenProvider from "../commonlib/azureLogin";
import CLILogProvider from "../commonlib/log";
import * as constants from "../constants";
import { setSubscriptionId, toYargsOptions } from "../utils";
import CliTelemetry from "../telemetry/cliTelemetry";
import { TelemetryEvent, TelemetryProperty, TelemetrySuccess } from "../telemetry/cliTelemetryEvents";

class LoginAccount extends YargsCommand {
  public readonly commandHead = `login`;
  public readonly command = `${this.commandHead} <service>`;
  public readonly description = "Log in to the selected cloud service.";

  public builder(yargs: Argv): Argv<any> {
    return yargs.positional("service", {
      description: "Azure or M365",
      type: "string",
      choices: ["azure", "m365"]
    });
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.AccountLoginStart, {
      [TelemetryProperty.AccountType]: args.platform
    });
    switch (args.platform) {
      case "azure": {
        const result = await AzureTokenProvider.getAccountCredentialAsync();
        if (result) {
          console.log(colors.green(`[${constants.cliSource}] Successfully signed in to Azure. Your username is ${colors.yellow((result as any).username)}.`));
          console.log(colors.green(`[${constants.cliSource}] Your subscriptons are:`));
          const subscriptions = await AzureTokenProvider.listSubscriptions();
          console.log(subscriptions);
        } else {
          CLILogProvider.error(`[${constants.cliSource}] Failed to sign in to Azure.`);
        }
        CliTelemetry.sendTelemetryEvent(TelemetryEvent.AccountLogin, {
          [TelemetryProperty.AccountType]: args.platform,
          [TelemetryProperty.Success]: result? TelemetrySuccess.Yes : TelemetrySuccess.No
        });
        break;
      }
      case "m365": {
        const result = await AppStudioTokenProvider.getJsonObject();
        if (result) {
          console.log(colors.green(`[${constants.cliSource}] Successfully signed in to M365. Your account email is ${colors.yellow((result as any).upn)}.`));
        } else {
          CLILogProvider.error(`[${constants.cliSource}] Failed to sign in to M365.`);
        }
        CliTelemetry.sendTelemetryEvent(TelemetryEvent.AccountLogin, {
          [TelemetryProperty.AccountType]: args.platform,
          [TelemetryProperty.Success]: result? TelemetrySuccess.Yes : TelemetrySuccess.No
        });
        break;
      }
    }
    return ok(null);
  }
}

class LogoutAccount extends YargsCommand {
  public readonly commandHead = `logout`;
  public readonly command = `${this.commandHead} <service>`;
  public readonly description = "Log out of the selected cloud service.";

  public builder(yargs: Argv): Argv<any> {
    return yargs.positional("service", {
      description: "Azure or M365",
      type: "string",
      choices: ["azure", "m365"]
    });
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    switch (args.platform) {
      case "azure": {
        const result = await AzureTokenProvider.signout();
        if (result) {
          console.log(colors.green(`[${constants.cliSource}] Successfully signed out of Azure.`));
        } else {
          CLILogProvider.error(`[${constants.cliSource}] Failed to sign out of Azure.`);
        }
        break;
      }
      case "m365": {
        const result = await AppStudioTokenProvider.signout();
        if (result) {
          console.log(colors.green(`[${constants.cliSource}] Successfully signed out of M365.`));
        } else {
          CLILogProvider.error(`[${constants.cliSource}] Failed to sign out of M365.`);
        }
        break;
      }
    }
    return ok(null);
  }
}

class SetAccount extends YargsCommand {
  public readonly commandHead = `set`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Update account settings.";

  public builder(yargs: Argv): Argv<any> {
    const folderOption = toYargsOptions(constants.RootFolderNode.data as Question);
    const subsOption = toYargsOptions(constants.SubscriptionNode.data as Question);
    return yargs
      .options("folder", folderOption)
      .options("subscription", subsOption)
      .demandOption("subscription");
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return setSubscriptionId(args.subscription, args.folder);
  }
}

export default class Account extends YargsCommand {
  public readonly commandHead = `account`;
  public readonly command = `${this.commandHead} <action>`;
  public readonly description = "Manage cloud service accounts. The supported cloud services are 'Azure' and 'M365'.";

  public readonly subCommands: YargsCommand[] = [
    new LoginAccount(),
    new LogoutAccount(),
    new SetAccount()
  ];

  public builder(yargs: Argv): Argv<any> {
    yargs.options("action", {
      description: `${this.subCommands.map(cmd => cmd.commandHead).join("|")}`,
      type: "string",
      choices: this.subCommands.map(cmd => cmd.commandHead)
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
