// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import colors from "colors";
import { Argv } from "yargs";

import { FxError, ok, Question, Result } from "@microsoft/teamsfx-api";

import { YargsCommand } from "../yargsCommand";
import AppStudioTokenProvider from "../commonlib/appStudioLogin";
import AzureTokenProvider from "../commonlib/azureLogin";
import { signedIn } from "../commonlib/common/constant";
import CLILogProvider from "../commonlib/log";
import * as constants from "../constants";
import { getSubscriptionIdFromEnvFile, setSubscriptionId, toYargsOptions } from "../utils";
import CliTelemetry from "../telemetry/cliTelemetry";
import { TelemetryEvent, TelemetryProperty, TelemetrySuccess } from "../telemetry/cliTelemetryEvents";

function consoleGreen(msg: string) {
  console.log(colors.green(msg));
}

function consoleWhite(msg: string) {
  console.log(colors.white(msg));
}

function consoleYellow(msg: string) {
  console.log(colors.yellow(msg));
}

async function outputM365Info(commandType: "login" | "show"): Promise<boolean> {
  const result = await AppStudioTokenProvider.getJsonObject();
  if (result) {
    if (commandType === "login") {
      consoleGreen(`[${constants.cliSource}] Successfully signed in to M365. Your username is ${colors.yellow((result as any).upn)}.`)
    } else {
      consoleGreen(`[${constants.cliSource}] Your M365 Account is: ${colors.yellow((result as any).upn)}.`);
    }
  } else {
    if (commandType === "login") {
      CLILogProvider.error(`[${constants.cliSource}] Failed to sign in to M365.`);
    }
  }
  return Promise.resolve(result !== undefined);
}

async function outputAzureInfo(commandType: "login" | "show", tenantId = ""): Promise<boolean> {
  const result = await AzureTokenProvider.getAccountCredentialAsync(true, tenantId);
  if (result) {
    const subscriptions = await AzureTokenProvider.listSubscriptions();
    if (commandType === "login") {
      consoleGreen(
        `[${constants.cliSource}] Successfully signed in to Azure. Your username is ${colors.yellow((result as any).username)}.`
      );
      consoleGreen(`[${constants.cliSource}] Your subscriptions are:`);
      consoleWhite(JSON.stringify(subscriptions, null, 2));
    } else {
      try {
        const activeSub = await getSubscriptionIdFromEnvFile("./");
        if (activeSub) {
          consoleGreen(
            `[${constants.cliSource}] Your Azure Account is: ${colors.yellow((result as any).username)}`
            + ` and current active subscription id is: ${colors.yellow(activeSub)}.`
          );
        } else {
          consoleGreen(`[${constants.cliSource}] Your Azure Account is: ${colors.yellow((result as any).username)}.`);
          consoleGreen(
            `[${constants.cliSource}] Below is a list of all subscriptions we found,`
            + ` use \`teamsfx account set\` to set an active subscription.`
          );
          consoleWhite(JSON.stringify(subscriptions, null, 2));
        }
      } catch (e) {
        if (e.name === "ConfigNotFound") {
          consoleGreen(`[${constants.cliSource}] Your Azure Account is: ${colors.yellow((result as any).username)}.`);
          consoleYellow(
            "WARN：Azure subscription is set on project level. Run `teamsfx account show` command in a TeamsFx project folder to check active subscription information."
          );
        } else {
          throw e;
        }
      }
    }
  } else {
    if (commandType === "login") {
      CLILogProvider.error(`[${constants.cliSource}] Failed to sign in to Azure.`);
    }
  }
  return Promise.resolve(result !== undefined);
}

class AccountShow extends YargsCommand {
  public readonly commandHead = `show`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Display all connected cloud accounts information.";

  public builder(yargs: Argv): Argv<any> {
    return yargs;
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const m365Status = await AppStudioTokenProvider.getStatus();
    if (m365Status.status === signedIn) {
      await outputM365Info("show");
    }

    const azureStatus = await AzureTokenProvider.getStatus();
    if (azureStatus.status === signedIn) {
      await outputAzureInfo("show");
    }

    if (m365Status.status !== signedIn && azureStatus.status !== signedIn) {
      consoleGreen("Use `teamsfx account login azure` or `teamsfx account login m365` to log in to Azure or M365 account.");
    }

    return ok(null);
  }
}

class AccountLogin extends YargsCommand {
  public readonly commandHead = `login`;
  public readonly command = `${this.commandHead} <service>`;
  public readonly description = "Log in to the selected cloud service.";

  public builder(yargs: Argv): Argv<any> {
    return yargs
      .positional("service", {
        description: "Azure or M365",
        type: "string",
        choices: ["azure", "m365"]
      })
      .option("tenant", {
        description: "Authenticate with a specific Azure Active Directory tenant.",
        type: "string",
        default: ""
      });
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    switch (args.service) {
      case "azure": {
        await AzureTokenProvider.signout();
        const result = await outputAzureInfo("login", args.tenant);
        break;
      }
      case "m365": {
        await AppStudioTokenProvider.signout();
        const result = await outputM365Info("login");
        break;
      }
    }
    return ok(null);
  }
}

class AccountLogout extends YargsCommand {
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
    switch (args.service) {
      case "azure": {
        const result = await AzureTokenProvider.signout();
        if (result) {
          consoleGreen(`[${constants.cliSource}] Successfully signed out of Azure.`);
        } else {
          CLILogProvider.error(`[${constants.cliSource}] Failed to sign out of Azure.`);
        }
        break;
      }
      case "m365": {
        const result = await AppStudioTokenProvider.signout();
        if (result) {
          consoleGreen(`[${constants.cliSource}] Successfully signed out of M365.`);
        } else {
          CLILogProvider.error(`[${constants.cliSource}] Failed to sign out of M365.`);
        }
        break;
      }
    }
    return ok(null);
  }
}

class AccountSet extends YargsCommand {
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
    const result = await setSubscriptionId(args.subscription, args.folder);
    if (result.isErr()) {
      return result;
    }
    await outputAzureInfo("show");
    return ok(null);
  }
}

export default class Account extends YargsCommand {
  public readonly commandHead = `account`;
  public readonly command = `${this.commandHead} <action>`;
  public readonly description = "Manage cloud service accounts. The supported cloud services are 'Azure' and 'M365'.";

  public readonly subCommands: YargsCommand[] = [
    new AccountShow(),
    new AccountLogin(),
    new AccountLogout(),
    new AccountSet()
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
