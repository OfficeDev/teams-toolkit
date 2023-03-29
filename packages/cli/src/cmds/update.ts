// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, err, ok, Func } from "@microsoft/teamsfx-api";
import path from "path";
import { Argv } from "yargs";
import activate from "../activate";
import CliTelemetry, { makeEnvRelatedProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { getSystemInputs, askManifestFilePath, askTeamsManifestFilePath } from "../utils";
import { YargsCommand } from "../yargsCommand";
import {
  EnvOptions,
  RootFolderOptions,
  AadManifestOptions,
  AadManifestFilePathName,
  TeamsAppManifestOptions,
  TeamsAppManifestFilePathName,
} from "../constants";
import CLIUIInstance from "../userInteraction";
import { EnvNotSpecified } from "../error";
export class UpdateAadApp extends YargsCommand {
  public readonly commandHead = "aad-app";
  public readonly command = this.commandHead;
  public readonly description = "Update the AAD App in the current application.";

  public builder(yargs: Argv): Argv<any> {
    return yargs
      .options(EnvOptions)
      .options(RootFolderOptions)
      .options({
        [AadManifestFilePathName]: AadManifestOptions[AadManifestFilePathName],
      });
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.UpdateAadAppStart);
    const resultFolder = await activate(rootFolder);
    if (resultFolder.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateAadApp, resultFolder.error);
      return err(resultFolder.error);
    }
    const core = resultFolder.value;
    const inputs = getSystemInputs(rootFolder, args.env);
    inputs.ignoreEnvInfo = false;
    // Throw error if --env not specified
    if (!args.env && !CLIUIInstance.interactive) {
      const error = new EnvNotSpecified();
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateAadApp, error);
      return err(error);
    }
    // Update the aad manifest
    const result = await core.deployAadManifest(inputs);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.UpdateAadApp,
        result.error,
        makeEnvRelatedProperty(rootFolder, inputs)
      );

      return err(result.error);
    }
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateAadApp, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvRelatedProperty(rootFolder, inputs),
    });
    return ok(null);
  }
}

export class UpdateTeamsApp extends YargsCommand {
  public readonly commandHead = "teams-app";
  public readonly command = this.commandHead;
  public readonly description = "Update the Teams App manifest to Teams Developer Portal.";

  public builder(yargs: Argv): Argv<any> {
    return yargs
      .hide("interactive")
      .version(false)
      .options(EnvOptions)
      .options(RootFolderOptions)
      .options({
        [TeamsAppManifestFilePathName]: TeamsAppManifestOptions[TeamsAppManifestFilePathName],
      });
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.UpdateTeamsAppStart);
    const resultFolder = await activate(rootFolder);
    if (resultFolder.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateTeamsApp, resultFolder.error);
      return err(resultFolder.error);
    }
    const core = resultFolder.value;
    const inputs = getSystemInputs(rootFolder, args.env);

    let manifestTemplatePath;
    if (args[TeamsAppManifestFilePathName]) {
      manifestTemplatePath = args[TeamsAppManifestFilePathName];
    } else {
      const manifestTemplatePathRes = await askTeamsManifestFilePath();
      if (manifestTemplatePathRes.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(
          TelemetryEvent.UpdateTeamsApp,
          manifestTemplatePathRes.error
        );
        return err(manifestTemplatePathRes.error);
      }
      manifestTemplatePath = manifestTemplatePathRes.value;
    }
    if (!path.isAbsolute(manifestTemplatePath)) {
      manifestTemplatePath = path.join(inputs.projectPath!, manifestTemplatePath);
    }
    inputs.manifestTemplatePath = manifestTemplatePath;

    const result = await core.deployTeamsManifest(inputs);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.UpdateTeamsApp,
        result.error,
        makeEnvRelatedProperty(rootFolder, inputs)
      );
      return err(result.error);
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateTeamsApp, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvRelatedProperty(rootFolder, inputs),
    });

    return ok(null);
  }
}

export default class Update extends YargsCommand {
  public readonly commandHead = "update";
  public readonly command = `${this.commandHead} <application-manifest>`;
  public readonly description = "Update the specific application manifest file.";
  public readonly subCommands: YargsCommand[] = [new UpdateAadApp(), new UpdateTeamsApp()];
  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs
      .options("application-manifest", {
        choices: this.subCommands.map((c) => c.commandHead),
        global: false,
        hidden: true,
      })
      .version(false);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
