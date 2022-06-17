// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import path from "path";
import { Argv } from "yargs";

import { err, FxError, ok, Platform, ProjectSettings, Result } from "@microsoft/teamsfx-api";
import {
  AzureSolutionQuestionNames as Names,
  isBotNotificationEnabled,
  isPreviewFeaturesEnabled,
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
import { automaticNpmInstallHandler } from "./preview/npmInstallHandler";

abstract class CapabilityAddBase extends YargsCommand {
  abstract readonly yargsHelp: string;
  abstract getNpmInstallExcludeCaps(projectSettings: ProjectSettings | undefined): {
    excludeFrontend: boolean;
    excludeBackend: boolean;
    excludeBot: boolean;
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
    const { excludeFrontend, excludeBackend, excludeBot } = this.getNpmInstallExcludeCaps(
      configResult.value?.settings
    );
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

    await automaticNpmInstallHandler(rootFolder, excludeFrontend, excludeBackend, excludeBot);

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
  public readonly description = isPreviewFeaturesEnabled()
    ? "Hello world webpages embedded in Microsoft Teams"
    : "Teams identity aware webpages embedded in Microsoft Teams";
  public readonly yargsHelp = isPreviewFeaturesEnabled()
    ? "addCapability-TabNonSso"
    : "addCapability-Tab";

  public override getNpmInstallExcludeCaps(settings: ProjectSettings | undefined) {
    return {
      excludeFrontend: ProjectSettingsHelper.includeFrontend(settings),
      excludeBackend: true,
      excludeBot: true,
    };
  }
}

export class CapabilityAddSSOTab extends CapabilityAddBase {
  public readonly commandHead = `sso-tab`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Teams identity aware webpages embedded in Microsoft Teams";
  public readonly yargsHelp = "addCapability-Tab";

  public override getNpmInstallExcludeCaps(settings: ProjectSettings | undefined) {
    return {
      excludeFrontend: ProjectSettingsHelper.includeFrontend(settings),
      excludeBackend: true,
      excludeBot: true,
    };
  }
}

abstract class CapabilityAddBotBase extends CapabilityAddBase {
  public override getNpmInstallExcludeCaps(settings: ProjectSettings | undefined) {
    return {
      excludeFrontend: true,
      excludeBackend: true,
      excludeBot: ProjectSettingsHelper.includeBot(settings),
    };
  }
}

export class CapabilityAddBot extends CapabilityAddBotBase {
  public readonly commandHead = `bot`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Hello world chatbot to run simple and repetitive tasks by user";
  public readonly yargsHelp = "addCapability-Bot";
}

export class CapabilityAddMessageExtension extends CapabilityAddBotBase {
  public readonly commandHead = `message-extension`;
  public readonly command = `${this.commandHead}`;
  public readonly description =
    "Hello world message extension allowing interactions via buttons and forms";
  public readonly yargsHelp = "addCapability-MessagingExtension";
}

export class CapabilityAddNotification extends CapabilityAddBotBase {
  public readonly commandHead = "notification";
  public readonly command = `${this.commandHead}`;
  public readonly description = "Send notification to Microsoft Teams via various triggers";
  public readonly yargsHelp = "addCapability-Notification";
}

export class CapabilityAddCommandAndResponse extends CapabilityAddBotBase {
  public readonly commandHead = "command-and-response";
  public readonly command = `${this.commandHead}`;
  public readonly description = "Respond to simple commands in Microsoft Teams chat";
  public readonly yargsHelp = "addCapability-command-bot";
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
