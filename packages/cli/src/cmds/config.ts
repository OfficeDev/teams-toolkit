// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, err, LogLevel, ok } from "@microsoft/teamsfx-api";
import { isV3Enabled, dataNeedEncryption } from "@microsoft/teamsfx-core";
import path from "path";
import { Argv, PositionalOptions } from "yargs";
import activate from "../activate";
import CLILogProvider from "../commonlib/log";
import { EnvOptions, OptionsMap, RootFolderOptions } from "../constants";
import { EnvNotSpecified, NonTeamsFxProjectFolder, ConfigNameNotFound } from "../error";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { CliConfigOptions, UserSettings } from "../userSetttings";
import {
  readSettingsFileSync,
  readProjectSecrets,
  getSystemInputs,
  writeSecretToFile,
} from "../utils";
import { YargsCommand } from "../yargsCommand";

const GlobalOptionNames = () =>
  isV3Enabled()
    ? new Set([CliConfigOptions.Telemetry as string, CliConfigOptions.Interactive as string])
    : new Set([
        CliConfigOptions.Telemetry as string,
        CliConfigOptions.EnvCheckerValidateDotnetSdk as string,
        CliConfigOptions.EnvCheckerValidateFuncCoreTools as string,
        CliConfigOptions.EnvCheckerValidateNode as string,
        CliConfigOptions.EnvCheckerValidateNgrok as string,
        CliConfigOptions.TrustDevCert as string,
        CliConfigOptions.Interactive as string,
        // CliConfigOptions.AutomaticNpmInstall as string,
      ]);

const GlobalOptions: OptionsMap = {
  global: {
    alias: "g",
    describe: "The scope of config",
    type: "boolean",
    default: false,
  },
};

const ConfigOptionOptions: () => PositionalOptions = () => {
  return {
    type: "string",
    description: isV3Enabled() ? "User settings option" : "The option name of user global settings",
    array: isV3Enabled(),
    choices: isV3Enabled() ? Array.from(GlobalOptionNames().values()) : undefined,
  };
};

const ConfigValueOptions: () => PositionalOptions = () => {
  return {
    type: "string",
    description: isV3Enabled() ? "Option value" : "The option value of user global settings",
  };
};

export class ConfigGet extends YargsCommand {
  public readonly commandHead = `get`;
  public readonly command = `${this.commandHead} [option]`;
  public readonly description = isV3Enabled() ? "Get user global settings." : "Get user settings.";

  public builder(yargs: Argv): Argv<any> {
    yargs.positional("option", ConfigOptionOptions());
    if (!isV3Enabled()) yargs.options(RootFolderOptions).option(EnvOptions);
    return yargs;
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
      if (!args.global && inProject && !isV3Enabled()) {
        let env: string | undefined = undefined;
        if (args.env) {
          env = args.env;
        } else {
          return err(new EnvNotSpecified());
        }

        const projectResult = await this.printProjectConfig(rootFolder, env);
        if (projectResult.isErr()) {
          return projectResult;
        }
      }
    } else {
      if (GlobalOptionNames().has(args.option) || args.global || isV3Enabled()) {
        // global config
        if (!args.global && !isV3Enabled()) {
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
          if (args.env) {
            env = args.env;
          } else {
            return err(new EnvNotSpecified());
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
    if (option && GlobalOptionNames().has(option)) {
      CLILogProvider.necessaryLog(LogLevel.Info, JSON.stringify(config[option], null, 2), true);
    } else {
      CLILogProvider.necessaryLog(LogLevel.Info, JSON.stringify(config, null, 2), true);
    }
    return ok(null);
  }

  private async printProjectConfig(
    rootFolder: string,
    env: string,
    option?: string
  ): Promise<Result<null, FxError>> {
    let found = false;
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
    if (!isV3Enabled()) yargs.options(RootFolderOptions).options(EnvOptions);
    return yargs
      .positional("option", ConfigOptionOptions())
      .positional("value", ConfigValueOptions());
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");

    if (GlobalOptionNames().has(args.option) || args.global || isV3Enabled()) {
      // global config
      if (!args.global && !isV3Enabled()) {
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
      if (!args.global) {
        if (args.env) {
          env = args.env;
        } else {
          return err(new EnvNotSpecified());
        }
      }

      const inProject = readSettingsFileSync(rootFolder).isOk();
      // project config
      if (inProject) {
        const projectResult = await this.setProjectConfig(
          rootFolder,
          args.option,
          args.value,
          env!
        );
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
    if (GlobalOptionNames().has(option)) {
      const opt = { [option]: value };
      const result = UserSettings.setConfigSync(opt);
      if (result.isErr()) {
        CLILogProvider.necessaryLog(LogLevel.Error, "Configure user settings failed");
        return result;
      }
      CLILogProvider.necessaryLog(LogLevel.Info, `Successfully configured user setting ${option}.`);
    } else {
      CLILogProvider.necessaryLog(LogLevel.Warning, `No user setting ${option}.`);
    }
    return ok(null);
  }

  private async setProjectConfig(
    rootFolder: string,
    option: string,
    value: string,
    env: string
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
      return err(writeFileResult.error);
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
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    if (!isV3Enabled()) yargs.options(GlobalOptions);
    return yargs
      .options("action", {
        description: `${this.subCommands.map((cmd) => cmd.commandHead).join("|")}`,
        type: "string",
        choices: this.subCommands.map((cmd) => cmd.commandHead),
        global: false,
      })
      .version(false)
      .hide("interactive")
      .hide("action");
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
