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
import { argsToInputs, getSystemInputs, isSpfxProject } from "../utils";
import HelpParamGenerator from "../helpParamGenerator";
import CLILogProvider from "../commonlib/log";
import { isV3Enabled } from "@microsoft/teamsfx-core";
import { CollaborationConstants } from "@microsoft/teamsfx-core/build/core/collaborator";
import { EnvNotSpecified } from "../error";
import CLIUIInstance from "../userInteraction";
import { CoreQuestionNames } from "@microsoft/teamsfx-core/build/core/question";

const azureMessage =
  "Notice: Azure resources permission needs to be handled by subscription owner since privileged account is " +
  "required to grant permission to Azure resources.\n" +
  "Assign Azure roles using the Azure portal: " +
  "https://docs.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal?tabs=current";

const spfxMessage =
  "Notice: SPFX deployment permission needs to be handled manually by SharePoint site administrator.\n" +
  "Manage site admins using SharePoint admin center: " +
  "https://docs.microsoft.com/en-us/sharepoint/manage-site-collection-administrators";

const teamsAppId = "teams-app-id";
const aadObjectId = "aad-app-id";
const env = "env";
const teamsAppManifest = "teams-app-manifest";
const aadAppManifest = "aad-app-manifest";

export class PermissionStatus extends YargsCommand {
  public readonly commandHead = `status`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Check user's permission.";
  private readonly listAllCollaborators = "list-all-collaborators";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp(Stage.checkPermission);
    const result = yargs.option(this.params).option(this.listAllCollaborators, {
      description: `To list all collaborators`,
      name: this.listAllCollaborators,
      type: "boolean",
    });
    if (isV3Enabled()) {
      result
        .option(env, {
          description: "Select an existing environment for the project",
          type: "string",
          name: env,
        })
        .option(teamsAppManifest, {
          description: "Manifest of Your Teams app",
          name: teamsAppManifest,
          type: "string",
        })
        .option(aadAppManifest, {
          description: "Manifest of your Azure AD app",
          name: aadAppManifest,
          type: "string",
        });
    }

    return result;
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.CheckPermissionStart);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CheckPermission, result.error);
      return err(result.error);
    }

    const core = result.value;
    const listAll = args[this.listAllCollaborators];
    const inputs = getSystemInputs(rootFolder, args.env);

    if (!isV3Enabled()) {
      const isSpfx = await isSpfxProject(rootFolder, core);
      if (isSpfx.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CheckPermission, isSpfx.error);
        return err(isSpfx.error);
      }

      if (!isSpfx.value) {
        CLILogProvider.necessaryLog(LogLevel.Info, azureMessage);
      } else {
        CLILogProvider.necessaryLog(LogLevel.Info, spfxMessage);
      }
    } else {
      // Throw error if --env not specified
      if (!args[env] && !CLIUIInstance.interactive) {
        const error = new EnvNotSpecified();
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CheckPermission, error);
        return err(error);
      }

      // print necessary messages
      CLILogProvider.necessaryLog(LogLevel.Info, azureMessage);
      CLILogProvider.necessaryLog(LogLevel.Info, spfxMessage);

      // add user input to Inputs
      inputs[CoreQuestionNames.AadAppManifestFilePath] = args[aadAppManifest];
      inputs[CoreQuestionNames.TeamsAppManifestFilePath] = args[teamsAppManifest];
      inputs[env] = args[env];
    }

    {
      const result = listAll
        ? await core.listCollaborator(inputs)
        : await core.checkPermission(inputs);

      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CheckPermission, result.error, {
          [TelemetryProperty.ListAllCollaborators]: listAll,
        });
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.CheckPermission, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.ListAllCollaborators]: listAll,
    });
    return ok(null);
  }
}

export class PermissionGrant extends YargsCommand {
  public readonly commandHead = `grant`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Grant permission for another account.";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp(Stage.grantPermission);
    const result = yargs.option(this.params);

    if (isV3Enabled()) {
      result
        .option(env, {
          description: "Select an existing environment for the project",
          type: "string",
          name: env,
        })
        .option(teamsAppManifest, {
          description: "Manifest of Your Teams app",
          name: teamsAppManifest,
          type: "string",
        })
        .option(aadAppManifest, {
          description: "Manifest of your Azure AD app",
          name: aadAppManifest,
          type: "string",
        });
    }

    return result;
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.GrantPermissionStart);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.GrantPermission, result.error);
      return err(result.error);
    }

    const answers = argsToInputs(this.params, args);
    const core = result.value;

    if (!isV3Enabled()) {
      const isSpfx = await isSpfxProject(rootFolder, core);
      if (isSpfx.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CheckPermission, isSpfx.error);
        return err(isSpfx.error);
      }

      if (!isSpfx.value) {
        CLILogProvider.necessaryLog(LogLevel.Info, azureMessage);
      } else {
        CLILogProvider.necessaryLog(LogLevel.Info, spfxMessage);
      }
    } else {
      // Throw error if --env not specified
      if (!args[env] && !CLIUIInstance.interactive) {
        const error = new EnvNotSpecified();
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CheckPermission, error);
        return err(error);
      }

      // print necessary messages
      CLILogProvider.necessaryLog(LogLevel.Info, azureMessage);
      CLILogProvider.necessaryLog(LogLevel.Info, spfxMessage);

      // add user input to Inputs
      answers[CoreQuestionNames.AadAppManifestFilePath] = args[aadAppManifest];
      answers[CoreQuestionNames.TeamsAppManifestFilePath] = args[teamsAppManifest];
      answers[env] = args[env];
    }

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
