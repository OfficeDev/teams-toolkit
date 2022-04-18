// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import path from "path";
import { Argv } from "yargs";

import { err, FxError, ok, Platform, ProjectSettings, Result } from "@microsoft/teamsfx-api";
import {
  AzureSolutionQuestionNames as Names,
  isBotNotificationEnabled,
  ProjectSettingsHelper,
} from "@microsoft/teamsfx-core";

import activate from "../activate";
import { getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import CLIUIInstance from "../userInteraction";
import HelpParamGenerator from "../helpParamGenerator";
import { automaticNpmInstallHandlerByObject } from "./preview/npmInstallHandler";

abstract class CapabilityAddBase extends YargsCommand {
  abstract readonly yargsHelp: string;
  abstract getNpmInstallExcludeCaps(projectSettings: ProjectSettings | undefined): {
    frontend: boolean;
    backend: boolean;
    bot: boolean;
  };

  public override builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp(this.yargsHelp);
    return yargs.options(this.params);
  }

  public override modifyArguments(args: { [argName: string]: any }) {
    CLIUIInstance.updatePresetAnswer(Names.Capabilities, args[Names.Capabilities]);
    delete args[Names.Capabilities];
    return args;
  }

  public override async runCommand(args: {
    [argName: string]: string;
  }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.AddCapStart);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.AddCap, result.error, {
        [TelemetryProperty.Capabilities]: this.commandHead,
      });
      return err(result.error);
    }

    const core = result.value;
    const configResult = await core.getProjectConfig({
      projectPath: rootFolder,
      platform: Platform.CLI,
      ignoreEnvInfo: true,
    });
    if (configResult.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.AddCap, configResult.error, {
        [TelemetryProperty.Capabilities]: this.commandHead,
      });
      return err(configResult.error);
    }
    const exclude = this.getNpmInstallExcludeCaps(configResult.value?.settings);
    {
      const inputs = getSystemInputs(rootFolder);
      inputs.ignoreEnvInfo = true;
      const result = await core.executeUserTask(
        {
          namespace: "fx-solution-azure",
          method: "addCapability",
        },
        inputs
      );
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.AddCap, result.error, {
          [TelemetryProperty.Capabilities]: this.commandHead,
        });
        return err(result.error);
      }
    }

    await automaticNpmInstallHandlerByObject(rootFolder, exclude);

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.AddCap, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.Capabilities]: this.commandHead,
    });
    return ok(null);
  }
}

export class CapabilityAddTab extends CapabilityAddBase {
  public readonly commandHead = `tab`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Add a tab.";
  public readonly yargsHelp = "addCapability-Tab";

  public override getNpmInstallExcludeCaps(settings: ProjectSettings | undefined): {
    frontend: boolean;
    backend: boolean;
    bot: boolean;
  } {
    return { frontend: ProjectSettingsHelper.includeFrontend(settings), backend: true, bot: true };
  }
}

abstract class CapabilityAddBotBase extends CapabilityAddBase {
  public override getNpmInstallExcludeCaps(settings: ProjectSettings | undefined): {
    frontend: boolean;
    backend: boolean;
    bot: boolean;
  } {
    return { frontend: true, backend: true, bot: ProjectSettingsHelper.includeBot(settings) };
  }
}

export class CapabilityAddBot extends CapabilityAddBotBase {
  public readonly commandHead = `bot`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Add a bot.";
  public readonly yargsHelp = "addCapability-Bot";
}

export class CapabilityAddMessageExtension extends CapabilityAddBotBase {
  public readonly commandHead = `messaging-extension`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Add Messaging Extensions.";
  public readonly yargsHelp = "addCapability-MessagingExtension";
}

export class CapabilityAddNotification extends CapabilityAddBotBase {
  public readonly commandHead = "notification";
  public readonly command = `${this.commandHead}`;
  public readonly description = "Add notification.";
  public readonly yargsHelp = "addCapability-Notification";
}

export class CapabilityAddCommandAndResponse extends CapabilityAddBotBase {
  public readonly commandHead = "command-and-response";
  public readonly command = `${this.commandHead}`;
  public readonly description = "Add command and response.";
  public readonly yargsHelp = "addCapability-CommandAndResponse";
}

export class CapabilityAdd extends YargsCommand {
  public readonly commandHead = `add`;
  public readonly command = `${this.commandHead} [capability]`;
  public readonly description = "Add new capabilities to the current application";

  public readonly subCommands: YargsCommand[] = [
    new CapabilityAddTab(),
    ...(isBotNotificationEnabled()
      ? [new CapabilityAddCommandAndResponse(), new CapabilityAddNotification()]
      : [new CapabilityAddBot()]),
    new CapabilityAddMessageExtension(),
  ];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs.positional("capability", {
      choices: this.subCommands.map((c) => c.commandHead),
    });
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}

export default class Capability extends YargsCommand {
  public readonly commandHead = `capability`;
  public readonly command = `${this.commandHead} [action]`;
  public readonly description = "Add new capabilities to the current application.";

  public readonly subCommands: YargsCommand[] = [new CapabilityAdd()];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs
      .positional("action", {
        choices: this.subCommands.map((c) => c.commandHead),
      })
      .version(false);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
