// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";

import { FxError, err, ok, Result, Stage, LogLevel } from "@microsoft/teamsfx-api";

import { YargsCommand } from "../yargsCommand";
import { environmentManager, isValidProject } from "@microsoft/teamsfx-core";
import * as process from "process";
import * as os from "os";
import CLILogProvider from "../commonlib/log";
import { WorkspaceNotSupported } from "./preview/errors";
import HelpParamGenerator from "../helpParamGenerator";
import activate from "../activate";
import CliTelemetry from "../telemetry/cliTelemetry";
import { TelemetryEvent } from "../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../utils";

export default class Env extends YargsCommand {
  public readonly commandHead = `env`;
  public readonly command = `${this.commandHead} [action]`;
  public readonly description = "Manage environments.";

  public readonly subCommands: YargsCommand[] = [new EnvList()];

  public builder(yargs: Argv): Argv<any> {
    yargs.options("action", {
      description: `${this.subCommands.map((cmd) => cmd.commandHead).join("|")}`,
      type: "string",
      choices: this.subCommands.map((cmd) => cmd.commandHead),
      // Action is not required because we support "teamsfx env" to show current active env.
      require: false,
    });
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs.version(false);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    // TODO: display current active env info.
    return ok(null);
  }
}

class EnvList extends YargsCommand {
  public readonly commandHead = `list`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "List all environments.";
  public params: { [_: string]: Options } = {};

  public builder(yargs: Argv): Argv<any> {
    // TODO: support --details
    this.params = HelpParamGenerator.getYargsParamForHelp(Stage.listEnv);
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const projectDir = args.folder || process.cwd();

    if (!isValidProject(projectDir)) {
      return err(WorkspaceNotSupported(projectDir));
    }

    const envResult = await environmentManager.listEnvConfigs(projectDir);
    if (envResult.isErr()) {
      return err(envResult.error);
    }

    // TODO: support --details
    const envList = envResult.value.join(os.EOL);
    CLILogProvider.necessaryLog(LogLevel.Info, envList, true);
    return ok(null);
  }
}
