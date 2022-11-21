// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, err, ok, Void, Stage } from "@microsoft/teamsfx-api";
import path from "path";
import yargs, { Argv } from "yargs";
import activate from "../activate";
import { HelpParamGenerator } from "../helpParamGenerator";
import CliTelemetry, { makeEnvRelatedProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";

export class UpdateAadManifest extends YargsCommand {
  public readonly commandHead = "aad-app";
  public readonly command = this.commandHead;
  public readonly description = "Update the Teams Aad App Manifest in the current application.";

  public builder(yargs: Argv): Argv<any> {
    this.params = {
      folder: {
        describe: "Select root folder of the project",
        string: true,
      },
      env: {
        describe: "Select an existing environment for the AAD manifest",
        requiresArg: true,
        string: true,
      },
    };
    return yargs.options(this.params).version(false);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(
      TelemetryEvent.UpdateAadManifestStart
    );
    const resultFolder = await activate(rootFolder);
    if (resultFolder.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateAadManifest, resultFolder.error);
      return err(resultFolder.error);
    }
    const core = resultFolder.value;
    const inputs = getSystemInputs(rootFolder, args.env);
    inputs.ignoreEnvInfo = false;

    // Update the aad manifest
    const result = await core.deployAadManifest(inputs);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.UpdateAadManifest,
        result.error,
        makeEnvRelatedProperty(rootFolder, inputs)
      );

      return err(result.error);
    }
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateAadManifest, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvRelatedProperty(rootFolder, inputs),
    });
    return ok(null);
  }
}

export default class Update extends YargsCommand {
  public readonly commandHead = "update";
  public readonly command = `${this.commandHead} <application-manifest>`;
  public readonly description = "Update the specific manifest file in the current application.";
  public readonly subCommands: YargsCommand[] = [new UpdateAadManifest()];
  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs
      .options("manifest", {
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
