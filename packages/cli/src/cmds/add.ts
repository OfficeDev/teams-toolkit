// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";

import { err, Func, FxError, Inputs, ok, Result } from "@microsoft/teamsfx-api";
import CLIUIInstance from "../userInteraction";
import { YargsCommand } from "../yargsCommand";
import HelpParamGenerator from "../helpParamGenerator";
import path from "path";
import CliTelemetry, { makeEnvRelatedProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import activate from "../activate";
import { getSystemInputs } from "../utils";
import {
  ResourceAddApim,
  ResourceAddFunction,
  ResourceAddKeyVault,
  ResourceAddSql,
} from "./resource";
import {
  AddWebpart,
  CapabilityAddBot,
  CapabilityAddCommandAndResponse,
  CapabilityAddMessageExtension,
  CapabilityAddNotification,
  CapabilityAddSPFxTab,
  CapabilityAddSSOTab,
  CapabilityAddTab,
  CapabilityAddWorkflow,
} from "./capability";
import { isSPFxMultiTabEnabled } from "@microsoft/teamsfx-core/build/common/featureFlags";
import {
  isAadManifestEnabled,
  isApiConnectEnabled,
} from "@microsoft/teamsfx-core/build/common/tools";
import { isV3Enabled } from "@microsoft/teamsfx-core";
export class AddCICD extends YargsCommand {
  public readonly commandHead = `cicd`;
  public readonly command = this.commandHead;
  public readonly description = "Add CI/CD Workflows for GitHub, Azure DevOps or Jenkins";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp("addCICDWorkflows");
    return yargs.version(false).options(this.params);
  }

  public modifyArguments(args: { [argName: string]: any }): { [argName: string]: any } {
    return args;
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.AddCICDStart);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.AddCICD, result.error);
      return err(result.error);
    }
    const core = result.value;
    let inputs: Inputs;
    {
      const func: Func = {
        namespace: "fx-solution-azure/fx-resource-cicd",
        method: "addCICDWorkflows",
      };

      inputs = getSystemInputs(rootFolder, args.env as any);
      const result = await core.executeUserTask!(func, inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(
          TelemetryEvent.AddCICD,
          result.error,
          makeEnvRelatedProperty(rootFolder, inputs)
        );
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.AddCICD, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvRelatedProperty(rootFolder, inputs),
    });
    return ok(null);
  }
}

export abstract class AddExistingApiAuthBase extends YargsCommand {
  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(
      TelemetryEvent.ConnectExistingApiStart
    );
    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConnectExistingApi, result.error);
      return err(result.error);
    }
    const core = result.value;
    let inputs: Inputs;
    {
      const func: Func = {
        namespace: "fx-solution-azure/fx-resource-api-connector",
        method: "connectExistingApi",
      };

      inputs = getSystemInputs(rootFolder);
      const result = await core.executeUserTask!(func, inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ConnectExistingApi, result.error);
        return err(result.error);
      }
    }
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.ConnectExistingApi, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvRelatedProperty(rootFolder, inputs),
    });
    return ok(null);
  }
}

export class AddExistingApiSubCommand extends AddExistingApiAuthBase {
  public readonly commandHead: string;
  public readonly command: string;
  public readonly description: string;
  constructor(command: string) {
    super();
    this.commandHead = command;
    this.command = command;
    this.description = `Add connection to an API with ${command} auth`;
  }
  public override modifyArguments(args: { [argName: string]: any }) {
    CLIUIInstance.updatePresetAnswer("auth-type", this.commandHead);
    return args;
  }
  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp(`connectExistingApi-${this.commandHead}`);
    return yargs.options(this.params);
  }
}

export class AddExistingApiMainCommand extends AddExistingApiAuthBase {
  public readonly commandHead = `api-connection`;
  public readonly command = `${this.commandHead} [auth-type]`;
  public readonly description = "Connect to an API with authentication support using TeamsFx SDK";

  public readonly subCommands: YargsCommand[] = [
    new AddExistingApiSubCommand("basic"),
    new AddExistingApiSubCommand("aad"),
    new AddExistingApiSubCommand("apikey"),
    new AddExistingApiSubCommand("cert"),
    new AddExistingApiSubCommand("custom"),
  ];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs.version(false).options("auth-type", {
      choices: this.subCommands.map((c) => c.commandHead),
      global: false,
      hidden: true,
    });
  }
}

export class AddSso extends YargsCommand {
  public readonly commandHead = `sso`;
  public readonly command = this.commandHead;
  public readonly description =
    "Develop a Single Sign-On feature for Teams Launch pages and Bot capability";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp("addSso");
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.AddSsoStart);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.AddSso, result.error);
      return err(result.error);
    }

    const func = {
      namespace: "fx-solution-azure",
      method: "addSso",
    };

    const core = result.value;
    const inputs = getSystemInputs(rootFolder);
    {
      inputs.ignoreEnvInfo = true;
      const result = await core.executeUserTask(func, inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.AddSso, result.error, {
          [TelemetryProperty.Capabilities]: this.commandHead,
        });
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.AddSso, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvRelatedProperty(rootFolder, inputs),
    });
    return ok(null);
  }
}

export default class Add extends YargsCommand {
  public readonly commandHead = `add`;
  public readonly command = `${this.commandHead} <feature>`;
  public readonly description = "Adds features to your Teams application.";

  public readonly subCommands: YargsCommand[] = isV3Enabled()
    ? [new AddWebpart()]
    : [
        // Category 1: Add Teams Capability
        new CapabilityAddNotification(),
        new CapabilityAddCommandAndResponse(),
        new CapabilityAddWorkflow(),
        new CapabilityAddSSOTab(),
        new CapabilityAddTab(),
        ...(isSPFxMultiTabEnabled() ? [new CapabilityAddSPFxTab()] : []),
        new CapabilityAddBot(),
        new CapabilityAddMessageExtension(),

        // Category 2: Add Cloud Resources
        new ResourceAddFunction(),
        new ResourceAddApim(),
        new ResourceAddSql(),
        new ResourceAddKeyVault(),

        // Category 3: Standalone features
        ...(isAadManifestEnabled() ? [new AddSso()] : []),
        ...(isApiConnectEnabled() ? [new AddExistingApiMainCommand()] : []),
        new AddCICD(),
      ];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs
      .option("feature", {
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
