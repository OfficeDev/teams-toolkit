// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";
import * as path from "path";
import { YargsCommand } from "../yargsCommand";
import { FxError, Question, Result, ok, err, LogLevel } from "@microsoft/teamsfx-api";
import { dataNeedEncryption, environmentManager, isMultiEnvEnabled } from "@microsoft/teamsfx-core";
import { UserSettings, CliConfigOptions, CliConfigTelemetry } from "../userSetttings";
import CLILogProvider from "../commonlib/log";
import {
  readProjectSecrets,
  writeSecretToFile,
  getSystemInputs,
  readEnvJsonFile,
  toYargsOptions,
  readSettingsFileSync,
} from "../utils";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import activate from "../activate";
import { NonTeamsFxProjectFolder, ConfigNameNotFound, EnvNotSpecified } from "../error";
import * as constants from "../constants";

const GlobalOptions = new Set([
  CliConfigOptions.Telemetry as string,
  CliConfigOptions.EnvCheckerValidateDotnetSdk as string,
  CliConfigOptions.EnvCheckerValidateFuncCoreTools as string,
  CliConfigOptions.EnvCheckerValidateNode as string,
  CliConfigOptions.RunFrom as string,
]);

export class ConfigGet extends YargsCommand {
  public readonly commandHead = `get`;
  public readonly command = `${this.commandHead} [option]`;
  public readonly description = "Get user settings.";

  public builder(yargs: Argv): Argv<any> {
    const result = yargs.positional("option", {
      description: "User settings option",
      type: "string",
    });

    if (isMultiEnvEnabled()) {
      return result.option("env", {
        description: "Environment name",
        type: "string",
      });
    } else {
      return result;
    }
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    const inProject = readSettingsFileSync(rootFolder).isOk();

    if (args.option === undefined) {
      // print all
      const globalResult = await this.printGlobalConfig();
      if (globalResult.isErr()) {
        return globalResult;
      }
      if (!args.global && inProject) {
        let env: string | undefined = undefined;
        if (isMultiEnvEnabled()) {
          if (args.env) {
            env = args.env;
          } else {
            return err(new EnvNotSpecified());
          }
        } else {
          env = environmentManager.getDefaultEnvName();
        }

        const projectResult = await this.printProjectConfig(rootFolder, env);
        if (projectResult.isErr()) {
          return projectResult;
        }
      }
    } else {
      if (GlobalOptions.has(args.option) || args.global) {
        // global config
        if (!args.global) {
          CLILogProvider.necessaryLog(
            LogLevel.Warning,
            "Showing global config. You can add '-g' to specify global scope."
          );
        }
        const globalResult = await this.printGlobalConfig(args.option);
        if (globalResult.isErr()) {
          return globalResult;
        }
      } else {
        // project config
        if (inProject) {
          let env: string | undefined = undefined;
          if (isMultiEnvEnabled()) {
            if (args.env) {
              env = args.env;
            } else {
              return err(new EnvNotSpecified());
            }
          } else {
            env = environmentManager.getDefaultEnvName();
          }
          const projectResult = await this.printProjectConfig(rootFolder, env, args.option);
          if (projectResult.isErr()) {
            return projectResult;
          }
        } else {
          CLILogProvider.necessaryLog(
            LogLevel.Warning,
            `You can change to teamsfx project folder or use --folder to specify.`
          );
          const error = NonTeamsFxProjectFolder();
          CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigGet, error);
          return err(error);
        }
      }
    }
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.ConfigGet, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
    return ok(null);
  }

  private async printGlobalConfig(option?: string): Promise<Result<null, FxError>> {
    const result = UserSettings.getConfigSync();
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigGet, result.error);
      return result;
    }

    const config = result.value;
    switch (option) {
      case CliConfigOptions.Telemetry:
        CLILogProvider.necessaryLog(LogLevel.Info, JSON.stringify(config.telemetry, null, 2), true);
        return ok(null);
      case CliConfigOptions.EnvCheckerValidateDotnetSdk:
        CLILogProvider.necessaryLog(
          LogLevel.Info,
          JSON.stringify(config[CliConfigOptions.EnvCheckerValidateDotnetSdk], null, 2),
          true
        );
        return ok(null);
      case CliConfigOptions.EnvCheckerValidateFuncCoreTools:
        CLILogProvider.necessaryLog(
          LogLevel.Info,
          JSON.stringify(config[CliConfigOptions.EnvCheckerValidateFuncCoreTools], null, 2),
          true
        );
        return ok(null);
      case CliConfigOptions.EnvCheckerValidateNode:
        CLILogProvider.necessaryLog(
          LogLevel.Info,
          JSON.stringify(config[CliConfigOptions.EnvCheckerValidateNode], null, 2),
          true
        );
        return ok(null);
    }

    CLILogProvider.necessaryLog(LogLevel.Info, JSON.stringify(config, null, 2), true);
    return ok(null);
  }

  private async printProjectConfig(
    rootFolder: string,
    env: string | undefined,
    option?: string
  ): Promise<Result<null, FxError>> {
    let found = false;
    // TODO: check file not found error before provision
    const result = await readProjectSecrets(rootFolder, env);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigGet, result.error);
      return err(result.error);
    }
    const secretData = result.value;
    if (option && secretData[option] && !dataNeedEncryption(option)) {
      found = true;
      CLILogProvider.necessaryLog(LogLevel.Info, `${option}: ${secretData[option]}`, true);
      return ok(null);
    }

    const core = await activate(rootFolder);
    if (core.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigGet, core.error);
      return err(core.error);
    }

    for (const secretKey of Object.keys(secretData)) {
      if (!option || option === secretKey) {
        found = true;
        const secretValue = secretData[secretKey];
        if (dataNeedEncryption(secretKey)) {
          const decrypted = await core.value.decrypt(secretValue, getSystemInputs(rootFolder, env));
          if (decrypted.isOk()) {
            CLILogProvider.necessaryLog(LogLevel.Info, `${secretKey}: ${decrypted.value}`, true);
          } else {
            CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigGet, decrypted.error);
            return err(decrypted.error);
          }
        } else {
          CLILogProvider.necessaryLog(LogLevel.Info, `${secretKey}: ${secretValue}`, true);
        }
      }
    }
    if (option && !found) {
      const error = ConfigNameNotFound(option);
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigGet, error);
      return err(error);
    }
    return ok(null);
  }
}

export class ConfigSet extends YargsCommand {
  public readonly commandHead = `set`;
  public readonly command = `${this.commandHead} <option> <value>`;
  public readonly description = "Set user settings.";

  public builder(yargs: Argv): Argv<any> {
    const result = yargs
      .positional("option", {
        describe: "User settings option",
        type: "string",
      })
      .positional("value", {
        describe: "Option value",
        type: "string",
      });
    if (isMultiEnvEnabled()) {
      return result.option("env", {
        description: "Environment name",
        type: "string",
      });
    } else {
      return result;
    }
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");

    if (GlobalOptions.has(args.option) || args.global) {
      // global config
      if (!args.global) {
        CLILogProvider.necessaryLog(
          LogLevel.Warning,
          "Setting user config. You can add '-g' to specify global scope."
        );
      }
      const globalResult = await this.setGlobalConfig(args.option, args.value);
      if (globalResult.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigSet, globalResult.error);
        return globalResult;
      }
    } else {
      let env: string | undefined = undefined;
      if (isMultiEnvEnabled()) {
        if (!args.global) {
          if (args.env) {
            env = args.env;
          } else {
            return err(new EnvNotSpecified());
          }
        }
      } else {
        env = environmentManager.getDefaultEnvName();
      }
      const inProject = (await readEnvJsonFile(rootFolder, env)).isOk();
      // project config
      if (inProject) {
        const projectResult = await this.setProjectConfig(rootFolder, args.option, args.value, env);
        if (projectResult.isErr()) {
          return projectResult;
        }
      } else {
        CLILogProvider.necessaryLog(
          LogLevel.Warning,
          `You can change to teamsfx project folder or use --folder to specify.`
        );
        const error = NonTeamsFxProjectFolder();
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigSet, error);
        return err(error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.ConfigSet, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
    return ok(null);
  }

  private async setGlobalConfig(option: string, value: string): Promise<Result<null, FxError>> {
    switch (option) {
      case CliConfigOptions.Telemetry:
      case CliConfigOptions.EnvCheckerValidateDotnetSdk:
      case CliConfigOptions.EnvCheckerValidateFuncCoreTools:
      case CliConfigOptions.EnvCheckerValidateNode:
      case CliConfigOptions.RunFrom:
        const opt = { [option]: value };
        const result = UserSettings.setConfigSync(opt);
        if (result.isErr()) {
          CLILogProvider.necessaryLog(LogLevel.Error, "Configure user settings failed");
          return result;
        }
        CLILogProvider.necessaryLog(
          LogLevel.Info,
          `Successfully configured user setting ${option}.`
        );
        return ok(null);
    }
    CLILogProvider.necessaryLog(LogLevel.Warning, `No user setting ${option}.`);
    return ok(null);
  }

  private async setProjectConfig(
    rootFolder: string,
    option: string,
    value: string,
    env: string | undefined
  ): Promise<Result<null, FxError>> {
    const result = await readProjectSecrets(rootFolder, env);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigSet, result.error);
      return err(result.error);
    }
    const secretData = result.value;
    if (!secretData[option]) {
      const error = ConfigNameNotFound(option);
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigSet, error);
      return err(error);
    }
    if (!dataNeedEncryption(option)) {
      secretData[option] = value;
    } else {
      const core = await activate(rootFolder);
      if (core.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigSet, core.error);
        return err(core.error);
      }
      const encrypted = await core.value.encrypt(value, getSystemInputs(rootFolder));
      if (encrypted.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigSet, encrypted.error);
        return err(encrypted.error);
      }
      secretData[option] = encrypted.value;
    }
    const writeFileResult = writeSecretToFile(secretData, rootFolder, env);
    if (writeFileResult.isErr()) {
      return writeFileResult;
    }
    CLILogProvider.necessaryLog(
      LogLevel.Info,
      `Successfully configured project setting ${option}.`
    );
    return ok(null);
  }
}

export default class Config extends YargsCommand {
  public readonly commandHead = `config`;
  public readonly command = `${this.commandHead} <action>`;
  public readonly description = "Configure user settings.";

  public readonly subCommands: YargsCommand[] = [new ConfigGet(), new ConfigSet()];

  public builder(yargs: Argv): Argv<any> {
    const folderOption = toYargsOptions(constants.RootFolderNode.data as Question);
    folderOption.global = true;
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs
      .options("global", {
        alias: "g",
        describe: "scope of config",
        type: "boolean",
        default: false,
      })
      .options("folder", folderOption)
      .version(false);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
