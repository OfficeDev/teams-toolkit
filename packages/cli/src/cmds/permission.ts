// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import path from "path";
import { FxError, err, ok, Result, Stage, LogLevel } from "@microsoft/teamsfx-api";
import { Argv, Options } from "yargs";
import { YargsCommand } from "../yargsCommand";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import activate from "../activate";
import { argsToInputs, getSystemInputs } from "../utils";
import HelpParamGenerator from "../helpParamGenerator";
import CLILogProvider from "../commonlib/log";

export class PermissionStatus extends YargsCommand {
  public readonly commandHead = `status`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Check user's permission.";
  private readonly listAllCollaborator = "list-all-collaborator";

  public params: { [_: string]: Options } = {};

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp(Stage.checkPermission);
    return yargs.option(this.params).option(this.listAllCollaborator, {
      description: `To list all collaborators`,
      name: this.listAllCollaborator,
      type: "boolean",
    });
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.CheckPermissionStart);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CheckPermission, result.error);
      return err(result.error);
    }

    CLILogProvider.necessaryLog(
      LogLevel.Info,
      "Notice: Azure resources permission needs to be handled by subscription owner since privileged account is " +
        "required to grant permission to Azure resources.\n" +
        "[Assign Azure roles using the Azure portal] " +
        "https://docs.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal?tabs=current"
    );

    const core = result.value;
    const listAll = args[this.listAllCollaborator];
    let coreResult;
    if (listAll) {
      coreResult = await core.listCollaborator(getSystemInputs(rootFolder, args.env));
    } else {
      coreResult = await core.checkPermission(getSystemInputs(rootFolder, args.env));
    }

    if (coreResult.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CheckPermission, coreResult.error, {
        [TelemetryProperty.ListAllCollaborator]: listAll,
      });
      return err(coreResult.error);
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.CheckPermission, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.ListAllCollaborator]: listAll,
    });
    return ok(null);
  }
}

export class PermissionGrant extends YargsCommand {
  public readonly commandHead = `grant`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Grant permission for another account.";

  public params: { [_: string]: Options } = {};

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp(Stage.grantPermission);
    return yargs.option(this.params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.GrantPermissionStart);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.GrantPermission, result.error);
      return err(result.error);
    }

    CLILogProvider.necessaryLog(
      LogLevel.Info,
      "Notice: Azure resources permission needs to be handled by subscription owner since privileged account is " +
        "required to grant permission to Azure resources.\n" +
        "[Assign Azure roles using the Azure portal] " +
        "https://docs.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal?tabs=current"
    );

    const answers = argsToInputs(this.params, args);
    const core = result.value;
    {
      const result = await core.grantPermission(answers);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.GrantPermission, result.error);
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.GrantPermission, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
    return ok(null);
  }
}

export default class Permission extends YargsCommand {
  public readonly commandHead = `permission`;
  public readonly command = `${this.commandHead} <action>`;
  public readonly description = "Check, grant and list user permission.";

  public readonly subCommands: YargsCommand[] = [new PermissionStatus(), new PermissionGrant()];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });

    return yargs.version(false);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
