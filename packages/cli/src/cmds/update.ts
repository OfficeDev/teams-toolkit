// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, err, ok } from "@microsoft/teamsfx-api";
import path from "path";
import { Argv } from "yargs";
import activate from "../activate";
import CliTelemetry, { makeEnvRelatedProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";
import { EnvOptions, RootFolderOptions } from "../constants";
export class UpdateAadApp extends YargsCommand {
  public readonly commandHead = "aad-app";
  public readonly command = this.commandHead;
  public readonly description = "Update the AAD App in the current application.";

  public builder(yargs: Argv): Argv<any> {
    return yargs.hide("interactive").version(false).options(EnvOptions).options(RootFolderOptions);
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

export default class Update extends YargsCommand {
  public readonly commandHead = "update";
  public readonly command = `${this.commandHead} <application-manifest>`;
  public readonly description = "Update the specific application manifest file.";
  public readonly subCommands: YargsCommand[] = [new UpdateAadApp()];
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
