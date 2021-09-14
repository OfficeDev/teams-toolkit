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
  ProjectFolderExistError,
  setActiveEnv,
} from "@microsoft/teamsfx-core";
import * as process from "process";
import * as os from "os";
import CLILogProvider from "../commonlib/log";
import { WorkspaceNotSupported } from "./preview/errors";
import HelpParamGenerator from "../helpParamGenerator";
import activate from "../activate";
import CliTelemetry from "../telemetry/cliTelemetry";
import { TelemetryEvent } from "../telemetry/cliTelemetryEvents";
import { getChoicesFromQTNodeQuestion, getSystemInputs, isWorkspaceSupported } from "../utils";
import { EnvNodeNoCreate } from "../constants";

const ActiveMark = " (active)";

export default class Env extends YargsCommand {
  public readonly commandHead = `env`;
  public readonly command = `${this.commandHead} [action]`;
  public readonly description = "Manage environments.";

  public readonly subCommands: YargsCommand[] = [new EnvAdd(), new EnvList(), new EnvActivate()];

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
    const projectDir = args.folder || process.cwd();

    if (!isWorkspaceSupported(projectDir)) {
      return err(WorkspaceNotSupported(projectDir));
    }

    const activeEnvResult = environmentManager.getActiveEnv(projectDir);
    if (activeEnvResult.isErr()) {
      return err(activeEnvResult.error);
    }

    CLILogProvider.necessaryLog(LogLevel.Info, activeEnvResult.value, true);
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

    const validNewTargetEnvResult = await this.validNewTargetEnvName(projectDir, targetEnv);
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

  private async validNewTargetEnvName(
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

    const activeEnvResult = await environmentManager.getActiveEnv(projectDir);
    let activeEnv: string | undefined;
    if (activeEnvResult.isOk()) {
      activeEnv = activeEnvResult.value;
    } else {
      // Do not block user to list envs on failure to retrieve activeEnv
      CLILogProvider.warning("Failed to get active env, error: " + activeEnvResult.error);
    }

    // TODO: support --details
    const envList = envResult.value
      .map((env) => (env === activeEnv ? env + ActiveMark : env))
      .join(os.EOL);
    CLILogProvider.necessaryLog(LogLevel.Info, envList, true);
    return ok(null);
  }
}

class EnvActivate extends YargsCommand {
  public readonly commandHead = `activate`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Activate an environment.";
  public params: { [_: string]: Options } = {};

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp(Stage.activateEnv);
    return yargs.version(false).options(this.params).demandOption(EnvNodeNoCreate.data.name!);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const projectDir = args.folder || process.cwd();
    // env always exists because we have `demandOption` in builder.
    const env = args.env as string;

    if (!isWorkspaceSupported(projectDir)) {
      return err(WorkspaceNotSupported(projectDir));
    }

    const coreResult = await activate(projectDir);
    if (coreResult.isErr()) {
      return err(coreResult.error);
    }

    const fxCore = coreResult.value;
    const inputs = getSystemInputs(projectDir);
    inputs.env = env;
    const result = await fxCore.activateEnv(inputs);
    if (result.isErr()) {
      return err(result.error);
    }

    return ok(null);
  }
}
