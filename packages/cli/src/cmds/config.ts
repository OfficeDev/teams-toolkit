// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import { Argv } from "yargs";
import activate from "../activate";
import { YargsCommand } from "../yargsCommand";
import { Core, FxError, Result, ok, err, LogLevel } from "@microsoft/teamsfx-api";
import { UserSettings, CliConfigOptions, CliConfigTelemetry } from "../userSetttings";
import CLILogProvider from "../commonlib/log";
import { HelpParamGenerator } from "../helpParamGenerator";
import { readProjectSecrets, getSystemInputs, readConfigs } from "../utils";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { NonTeamsFxProjectFolder, ConfigNameNotFound } from "../error";

export class ConfigGet extends YargsCommand {
  public readonly commandHead = `get`;
  public readonly command = `${this.commandHead} [option]`;
  public readonly description = "Get user settings.";

  public builder(yargs: Argv): Argv<any> {
    const params = HelpParamGenerator.getYargsParamForHelp("");
    return yargs
      .positional("option", {
        description: "User settings option",
        type: "string",
      })
      .option("global", {
        alias: "g",
        describe: "scope of config",
        type: "boolean",
        default: false,
      })
      .option(params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const result = UserSettings.getConfigSync();
    if (result.isErr()) {
      return result;
    }
    const config = result.value;
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.ConfigGet);
    const inProject = (await readConfigs(rootFolder)).isOk();
    let core: Result<Core, FxError>;

    if (args.option !== "") {
      if (args.option === CliConfigOptions.Telemetry) {
        // global config
        if (!args.global) {
          CLILogProvider.necessaryLog(
            LogLevel.Warning,
            "Showing global config. You can add '-g' to specify global scope."
          );
        }
        CLILogProvider.necessaryLog(LogLevel.Info, JSON.stringify(config.telemetry, null, 2), true);
        CliTelemetry.sendTelemetryEvent(TelemetryEvent.ConfigGet, {
          [TelemetryProperty.Success]: TelemetrySuccess.Yes,
        });
        return ok(null);
      } else {
        // local config
        if (inProject) {
          core = await activate(rootFolder);
          if (core.isOk()) {
            return this.showConfigValue(rootFolder, core.value, args.option);
          }
          CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigGet, core.error);
          return err(core.error);
        } else {
          CLILogProvider.necessaryLog(
            LogLevel.Warning,
            `You can change to teamsfx project folder or use --folder to specify.`
          );
          return err(NonTeamsFxProjectFolder());
        }
      }
    } else {
      CLILogProvider.necessaryLog(LogLevel.Info, JSON.stringify(config, null, 2), true);
      if (!args.global && inProject) {
        core = await activate(rootFolder);
        if (core.isOk()) {
          return this.showConfigValue(rootFolder, core.value);
        }
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigGet, core.error);
        return err(core.error);
      }
      CliTelemetry.sendTelemetryEvent(TelemetryEvent.ConfigGet, {
        [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      });
      return ok(null);
    }
  }

  private async showConfigValue(
    rootFolder: string,
    core: Core,
    configName?: string
  ): Promise<Result<null, FxError>> {
    const secretData = await readProjectSecrets(rootFolder);
    let found = false;
    for (const secretKey of Object.keys(secretData)) {
      if (!configName || configName === secretKey) {
        found = true;
        const secretValue = secretData[secretKey];
        const decrypted = await core.decrypt(secretValue, getSystemInputs(rootFolder));
        if (decrypted.isOk()) {
          CLILogProvider.necessaryLog(LogLevel.Info, `${secretKey}: ${decrypted.value}`);
        }
      }
    }
    if (configName && !found) {
      const error = ConfigNameNotFound(configName);
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigGet, error);
      return err(error);
    }
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.ConfigGet, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
    return ok(null);
  }
}

export class ConfigSet extends YargsCommand {
  public readonly commandHead = `set`;
  public readonly command = `${this.commandHead} <option> <value>`;
  public readonly description = "Set user settings.";

  public builder(yargs: Argv): Argv<any> {
    const params = HelpParamGenerator.getYargsParamForHelp("");
    return yargs
      .positional("option", {
        describe: "User settings option",
        type: "string",
      })
      .positional("value", {
        describe: "Option value",
        type: "string",
      })
      .option("global", {
        alias: "g",
        describe: "scope of config",
        type: "boolean",
        default: false,
      })
      .option(params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.ConfigSet);
    const inProject = (await readConfigs(rootFolder)).isOk();
    let core: Result<Core, FxError>;

    if (args.option === CliConfigOptions.Telemetry) {
      // global config
      if (!args.global) {
        CLILogProvider.necessaryLog(
          LogLevel.Warning,
          "Setting global config. You can add '-g' to specify global scope."
        );
      }
      const opt = { [args.option]: args.value };
      const result = UserSettings.setConfigSync(opt);
      if (result.isErr()) {
        CLILogProvider.necessaryLog(LogLevel.Error, "Configure user settings failed");
        return result;
      }
      CliTelemetry.sendTelemetryEvent(TelemetryEvent.ConfigSet, {
        [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      });
      return ok(null);
    } else {
      // local config
      if (inProject) {
        core = await activate(rootFolder);
        if (core.isOk()) {
          const secretData = await readProjectSecrets(rootFolder);
          if (!secretData[args.option]) {
            const error = ConfigNameNotFound(args.option);
            CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigSet, error);
            return err(error);
          }
          const encrypted = await core.value.encrypt(args.value, getSystemInputs(rootFolder));
          if (encrypted.isOk()) {
            secretData[args.option] = encrypted.value;
            CLILogProvider.necessaryLog(
              LogLevel.Info,
              `Successfully configured project secret ${args.option}.`
            );
            CliTelemetry.sendTelemetryEvent(TelemetryEvent.ConfigSet, {
              [TelemetryProperty.Success]: TelemetrySuccess.Yes,
            });
            return ok(null);
          } else {
            CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigSet, encrypted.error);
            return err(encrypted.error);
          }
        } else {
          CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConfigSet, core.error);
          return err(core.error);
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
    return yargs.version(false);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
