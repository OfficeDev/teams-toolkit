// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, LogLevel, Result, UserError, err, ok } from "@microsoft/teamsfx-api";
import { AppStudioScopes } from "@microsoft/teamsfx-core";
import { Argv, Options } from "yargs";
import { TextType, colorize } from "../colorize";
import AzureTokenProvider, { getAzureProvider } from "../commonlib/azureLogin";
import AzureTokenCIProvider from "../commonlib/azureLoginCI";
import { checkIsOnline } from "../commonlib/codeFlowLogin";
import {
  codeFlowLoginFormat,
  loginComponent,
  servicePrincipalLoginFormat,
  signedIn,
  usageError,
} from "../commonlib/common/constant";
import CLILogProvider from "../commonlib/log";
import M365TokenProvider from "../commonlib/m365Login";
import * as constants from "../constants";
import { strings } from "../resource";
import { toLocaleLowerCase } from "../utils";
import { YargsCommand } from "../yargsCommand";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import CliTelemetry from "../telemetry/cliTelemetry";

export async function outputM365Info(commandType: "login" | "show"): Promise<boolean> {
  const appStudioTokenJsonRes = await M365TokenProvider.getJsonObject({ scopes: AppStudioScopes });
  const result = appStudioTokenJsonRes.isOk() ? appStudioTokenJsonRes.value : undefined;
  if (result) {
    const username = (result as any).upn;
    if (commandType === "login") {
      CLILogProvider.outputSuccess(strings["account.login.m365"]);
    }
    CLILogProvider.outputInfo(strings["account.show.m365"], colorize(username, TextType.Important));
    return Promise.resolve(true);
  } else {
    if (commandType === "login") {
      CLILogProvider.necessaryLog(
        LogLevel.Error,
        `[${constants.cliSource}] Failed to sign in to Microsoft 365.`
      );
    }
  }
  return Promise.resolve(result !== undefined);
}

export async function outputAzureInfo(
  commandType: "login" | "show",
  tenantId = "",
  isServicePrincipal = false,
  userName = "",
  password = ""
): Promise<boolean> {
  let azureProvider = getAzureProvider();
  if (isServicePrincipal === true || (await AzureTokenCIProvider.load())) {
    await AzureTokenCIProvider.init(userName, password, tenantId);
    azureProvider = AzureTokenCIProvider;
  }
  const result = await azureProvider.getJsonObject(true);
  if (result) {
    const subscriptions = await azureProvider.listSubscriptions();
    const username = (result as any).upn;
    if (commandType === "login") {
      CLILogProvider.outputSuccess(strings["account.login.azure"]);
    }
    CLILogProvider.outputInfo(
      strings["account.show.azure"],
      colorize(username, TextType.Important),
      JSON.stringify(subscriptions, null, 2)
    );
    return Promise.resolve(true);
  } else {
    if (commandType === "login") {
      CLILogProvider.necessaryLog(
        LogLevel.Error,
        `[${constants.cliSource}] Failed to sign in to Azure.`
      );
    }
  }
  return Promise.resolve(result !== undefined);
}

export function outputAccountInfoOffline(accountType: string, username: string): boolean {
  CLILogProvider.outputInfo(
    strings["account.show.info"],
    accountType,
    colorize(username, TextType.Important)
  );
  return true;
}

class AccountShow extends YargsCommand {
  public readonly commandHead = `show`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Display all connected cloud accounts information.";

  public builder(yargs: Argv): Argv<any> {
    return yargs;
  }

  public async runCommand(_args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.AccountShowStart);
    const m365StatusRes = await M365TokenProvider.getStatus({ scopes: AppStudioScopes });
    if (m365StatusRes.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.AccountShow, m365StatusRes.error);
      return err(m365StatusRes.error);
    }
    const m365Status = m365StatusRes.value;
    if (m365Status.status === signedIn) {
      (await checkIsOnline())
        ? await outputM365Info("show")
        : outputAccountInfoOffline("Microsoft 365", (m365Status.accountInfo as any).upn);
    }

    const azureStatus = await AzureTokenProvider.getStatus();
    if (azureStatus.status === signedIn) {
      (await checkIsOnline())
        ? await outputAzureInfo("show")
        : outputAccountInfoOffline("Azure", (azureStatus.accountInfo as any).upn);
    }

    if (m365Status.status !== signedIn && azureStatus.status !== signedIn) {
      CLILogProvider.necessaryLog(
        LogLevel.Info,
        "Use `teamsfx account login azure` or `teamsfx account login m365` to log in to Azure or Microsoft 365 account."
      );
    }
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.AccountShow, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
    return ok(null);
  }
}

export class AccountLogin extends YargsCommand {
  public readonly commandHead = `login`;
  public readonly command = `${this.commandHead} <service>`;
  public readonly description = "Log in to the selected cloud service.";

  public readonly subCommands: YargsCommand[] = [new M365Login(), new AzureLogin()];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });

    return yargs;
  }

  public runCommand(_args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return new Promise((resolve) => resolve(ok(null)));
  }
}

export class M365Login extends YargsCommand {
  public readonly commandHead = `m365`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Log in to Microsoft 365.";

  public builder(yargs: Argv): Argv<any> {
    return yargs.options(this.params);
  }

  public async runCommand(_args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.AccountShowStart);
    await M365TokenProvider.signout();
    await outputM365Info("login");

    return ok(null);
  }
}

export class AzureLogin extends YargsCommand {
  public readonly commandHead = `azure`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Log in to Azure.";
  public params: { [_: string]: Options } = {};

  public builder(yargs: Argv): Argv<any> {
    return yargs
      .options("tenant", {
        description: "Authenticate with a specific Azure Active Directory tenant.",
        type: "string",
        default: "",
      })
      .options("service-principal", {
        description: "Authenticate Azure with a credential representing a service principal",
        type: "boolean",
        default: "false",
      })
      .options("username", {
        alias: "u",
        description: "Client ID for service principal",
        type: "string",
        default: "",
      })
      .options("password", {
        alias: "p",
        description: "Provide client secret or a pem file with key and public certificate.",
        type: "string",
        default: "",
      })
      .example("teamsfx account login azure", "Log in interactively.")
      .example(
        "teamsfx account login azure --service-principal -u USERNAME  -p SECRET --tenant TENANT_ID",
        "Log in with a service principal using client secret."
      )
      .example(
        'teamsfx account login azure --service-principal -u USERNAME  -p "C:/Users/mycertfile.pem" --tenant TENANT_ID',
        "Log in with a service principal using client certificate."
      );
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    if ((args["service-principal"] as any) === true) {
      if (!args.username || !args.password || !args.tenant) {
        throw new UserError(loginComponent, usageError, servicePrincipalLoginFormat);
      }
    } else {
      if (args.username || args.password || args.tenant) {
        throw new UserError(loginComponent, usageError, codeFlowLoginFormat);
      }
    }
    await AzureTokenProvider.signout();
    await outputAzureInfo(
      "login",
      args.tenant,
      args["service-principal"] as any,
      args.username,
      args.password
    );
    return ok(null);
  }
}

class AccountLogout extends YargsCommand {
  public readonly commandHead = `logout`;
  public readonly command = `${this.commandHead} <service>`;
  public readonly description = "Log out of the selected cloud service.";

  public builder(yargs: Argv): Argv<any> {
    return yargs.positional("service", {
      description: "Azure or Microsoft 365",
      type: "string",
      choices: ["azure", "m365"],
      coerce: toLocaleLowerCase,
    });
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    switch (args.service) {
      case "azure": {
        const result = await AzureTokenProvider.signout();
        if (result) {
          CLILogProvider.necessaryLog(
            LogLevel.Info,
            `[${constants.cliSource}] Successfully signed out of Azure.`
          );
        } else {
          CLILogProvider.necessaryLog(
            LogLevel.Error,
            `[${constants.cliSource}] Failed to sign out of Azure.`
          );
        }
        break;
      }
      case "m365": {
        const result = await M365TokenProvider.signout();
        if (result) {
          CLILogProvider.necessaryLog(
            LogLevel.Info,
            `[${constants.cliSource}] Successfully signed out of Microsoft 365.`
          );
        } else {
          CLILogProvider.necessaryLog(
            LogLevel.Error,
            `[${constants.cliSource}] Failed to sign out of Microsoft 365.`
          );
        }
        break;
      }
    }
    return ok(null);
  }
}

export default class Account extends YargsCommand {
  public readonly commandHead = `account`;
  public readonly command = `${this.commandHead} <action>`;
  public readonly description =
    "Manage cloud service accounts. The supported cloud services are 'Azure' and 'Microsoft 365'.";

  public readonly subCommands: YargsCommand[] = [
    new AccountShow(),
    new AccountLogin(),
    new AccountLogout(),
  ];

  public builder(yargs: Argv): Argv<any> {
    yargs.options("action", {
      description: `${this.subCommands.map((cmd) => cmd.commandHead).join("|")}`,
      type: "string",
      choices: this.subCommands.map((cmd) => cmd.commandHead),
      global: false,
    });
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs.version(false);
  }

  public runCommand(_args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return new Promise((resolve) => resolve(ok(null)));
  }
}
