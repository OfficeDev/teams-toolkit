// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, LogLevel, Result, err, ok } from "@microsoft/teamsfx-api";
import { CoreQuestionNames } from "@microsoft/teamsfx-core";
import path from "path";
import { Argv } from "yargs";
import activate from "../activate";
import CLILogProvider from "../commonlib/log";
import { CollaboratorEmailOptions, RootFolderOptions } from "../constants";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import CLIUIInstance from "../userInteraction";
import { getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";
import { MissingRequiredOptionError } from "../error";
import { globals } from "../globals";

export const azureMessage =
  "Notice: Azure resources permission needs to be handled by subscription owner since privileged account is " +
  "required to grant permission to Azure resources.\n" +
  "Assign Azure roles using the Azure portal: " +
  "https://docs.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal?tabs=current";

export const spfxMessage =
  "Notice: SPFX deployment permission needs to be handled manually by SharePoint site administrator.\n" +
  "Manage site admins using SharePoint admin center: " +
  "https://docs.microsoft.com/en-us/sharepoint/manage-site-collection-administrators";

const env = "env";
const teamsAppManifest = "teams-app-manifest";
const aadAppManifest = "aad-app-manifest";

export function setAppTypeInputs(inputs: Inputs): void {
  if (!CLIUIInstance.interactive) {
    // automatically set collaborationType in non-interactive mode
    inputs[CoreQuestionNames.collaborationAppType] = [];
    if (inputs[CoreQuestionNames.AadAppManifestFilePath]) {
      inputs[CoreQuestionNames.collaborationAppType].push("aadApp");
    }
    if (inputs[CoreQuestionNames.TeamsAppManifestFilePath]) {
      inputs[CoreQuestionNames.collaborationAppType].push("teamsApp");
    }
  }
}

export class PermissionStatus extends YargsCommand {
  public readonly commandHead = `status`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Check user's permission.";
  private readonly listAllCollaborators = "list-all-collaborators";

  public builder(yargs: Argv): Argv<any> {
    globals.options = ["teams-app-manifest", "aad-app-manifest", "env"];
    return yargs
      .options(RootFolderOptions)
      .options(this.listAllCollaborators, {
        description: `To list all collaborators`,
        name: this.listAllCollaborators,
        type: "boolean",
      })
      .options(env, {
        description: "Select an existing environment for the project",
        type: "string",
        name: env,
      })
      .options(teamsAppManifest, {
        description: "Manifest of Your Teams app",
        name: teamsAppManifest,
        type: "string",
      })
      .options(aadAppManifest, {
        description: "Manifest of your Azure AD app",
        name: aadAppManifest,
        type: "string",
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

    const core = result.value;
    const listAll = args[this.listAllCollaborators];
    const inputs = getSystemInputs(rootFolder, args.env);

    // Throw error if --env not specified
    if (!args[env] && !CLIUIInstance.interactive) {
      const error = new MissingRequiredOptionError("teamsfx status", "env");
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
    setAppTypeInputs(inputs);
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
    globals.options = ["teams-app-manifest", "aad-app-manifest", "env", "email"];
    return yargs
      .options(RootFolderOptions)
      .options(CollaboratorEmailOptions)
      .options(env, {
        description: "Select an existing environment for the project",
        type: "string",
        name: env,
      })
      .options(teamsAppManifest, {
        description: "Manifest of Your Teams app",
        name: teamsAppManifest,
        type: "string",
      })
      .options(aadAppManifest, {
        description: "Manifest of your Azure AD app",
        name: aadAppManifest,
        type: "string",
      });
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.GrantPermissionStart);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.GrantPermission, result.error);
      return err(result.error);
    }

    const answers = getSystemInputs(rootFolder);
    const core = result.value;

    // Throw error if --env not specified
    if (!args[env] && !CLIUIInstance.interactive) {
      const error = new MissingRequiredOptionError("teamsfx grant", "env");
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.GrantPermission, error);
      return err(error);
    }

    // print necessary messages
    CLILogProvider.necessaryLog(LogLevel.Info, azureMessage);
    CLILogProvider.necessaryLog(LogLevel.Info, spfxMessage);

    // add user input to Inputs
    answers["email"] = args["email"];
    answers[CoreQuestionNames.AadAppManifestFilePath] = args[aadAppManifest];
    answers[CoreQuestionNames.TeamsAppManifestFilePath] = args[teamsAppManifest];
    answers[env] = args[env];
    setAppTypeInputs(answers);
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

  public runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return new Promise((resolve) => resolve(ok(null)));
  }
}
