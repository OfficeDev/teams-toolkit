// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, err, ok } from "@microsoft/teamsfx-api";
import path from "path";
import { Argv } from "yargs";
import activate from "../activate";
import * as constants from "../constants";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";

export class InitInfra extends YargsCommand {
  public readonly commandHead = `infra`;
  public readonly command = this.commandHead;
  // TODO: change the string.
  public readonly description = "Initialize the infrastructure of the project.";

  public builder(yargs: Argv): Argv<any> {
    return yargs.options(constants.RootFolderOptions);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.InitInfraStart);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.InitInfra, result.error);
      return err(result.error);
    }

    const core = result.value;
    const inputs = getSystemInputs(rootFolder);

    const initResult = await core.initInfra(inputs);
    if (initResult.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.InitInfra, initResult.error);
      return err(initResult.error);
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.InitInfra, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
    return ok(null);
  }
}

export default class Init extends YargsCommand {
  public readonly commandHead = `init`;
  public readonly command = `${this.commandHead} <part>`;
  // TODO: change the string.
  public readonly description = "Initialize the project for using Teams Toolkit.";

  public readonly subCommands: YargsCommand[] = [new InitInfra()];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs
      .options("part", {
        choices: this.subCommands.map((c) => c.commandHead),
        global: false,
        hidden: true,
      })
      .version(false)
      .hide("interactive");
  }

  public async runCommand(args: any): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
