// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";

import { FxError, err, ok, Result, Stage, LogLevel } from "@microsoft/teamsfx-api";

import { YargsCommand } from "../yargsCommand";
import {
  environmentManager,
  InvalidEnvNameError,
  ProjectEnvAlreadyExistError,
} from "@microsoft/teamsfx-core";
import * as process from "process";
import * as os from "os";
import CLILogProvider from "../commonlib/log";
import { WorkspaceNotSupported } from "./preview/errors";
import HelpParamGenerator from "../helpParamGenerator";
import activate from "../activate";
import { getSystemInputs, isWorkspaceSupported } from "../utils";

export default class Env extends YargsCommand {
  public readonly commandHead = `env`;
  public readonly command = `${this.commandHead} [action]`;
  public readonly description = "Manage environments.";

  public readonly subCommands: YargsCommand[] = [new EnvAdd(), new EnvList()];

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
    return ok(null);
  }
}

class EnvAdd extends YargsCommand {
  public readonly commandHead = `add`;
  public readonly command = `${this.commandHead} <name>`;
  public readonly description =
    "Add a new environment by copying from current active environment or the specified environment.";
  public params: { [_: string]: Options } = {};

  public builder(yargs: Argv): Argv<any> {
    // TODO: support --details
    this.params = HelpParamGenerator.getYargsParamForHelp(Stage.createEnv);
    yargs.positional("name", {
      description: "The new environment name",
      type: "string",
      require: true,
    });
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const projectDir = args.folder || process.cwd();
    // args.name always exists because or `require: true` in builder
    const targetEnv = args.name as string;
    const argsEnv = args.env as string | undefined;

    if (!isWorkspaceSupported(projectDir)) {
      return err(WorkspaceNotSupported(projectDir));
    }

    const coreResult = await activate(projectDir);
    if (coreResult.isErr()) {
      return err(coreResult.error);
    }
    const fxCore = coreResult.value;

    let sourceEnv;
    if (argsEnv) {
      sourceEnv = argsEnv;
    } else {
      // fallback to copy from current active environment
      const activeEnvResult = environmentManager.getActiveEnv(projectDir);
      if (activeEnvResult.isErr()) {
        return err(activeEnvResult.error);
      }
      sourceEnv = activeEnvResult.value;
    }

    const validNewTargetEnvResult = await this.validateNewTargetEnvName(projectDir, targetEnv);
    if (validNewTargetEnvResult.isErr()) {
      return err(validNewTargetEnvResult.error);
    }

    const inputs = getSystemInputs(projectDir);
    inputs.newTargetEnvName = targetEnv;
    inputs.sourceEnvName = sourceEnv;

    const result = await fxCore.createEnv(inputs);
    if (result.isErr()) {
      return err(result.error);
    }

    return ok(null);
  }

  private async validateNewTargetEnvName(
    projectDir: string,
    newTargetEnvName: string
  ): Promise<Result<null, FxError>> {
    // valid target environment name
    const match = newTargetEnvName.match(environmentManager.envNameRegex);
    if (!match) {
      return err(InvalidEnvNameError());
    }
    const envConfigs = await environmentManager.listEnvConfigs(projectDir);
    if (!envConfigs.isErr() && envConfigs.value!.indexOf(newTargetEnvName) >= 0) {
      return err(ProjectEnvAlreadyExistError(newTargetEnvName));
    }

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

    if (!isWorkspaceSupported(projectDir)) {
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
