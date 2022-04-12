// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";

import { err, Func, FxError, Inputs, ok, Result } from "@microsoft/teamsfx-api";

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
  CapabilityAddBot,
  CapabilityAddCommandAndResponse,
  CapabilityAddMessageExtension,
  CapabilityAddNotification,
  CapabilityAddTab,
} from "./capability";
import { isBotNotificationEnabled } from "@microsoft/teamsfx-core";

export class AddCICD extends YargsCommand {
  public readonly commandHead = `cicd`;
  public readonly command = this.commandHead;
  public readonly description = "Add CI/CD Workflows for GitHub, Azure DevOps or Jenkins.";

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

export default class Add extends YargsCommand {
  public readonly commandHead = `add`;
  public readonly command = `${this.commandHead} <feature>`;
  public readonly description = "Adds features to your Teams application.";

  public readonly subCommands: YargsCommand[] = [
    // Category 1: Add Teams Capability
    ...(isBotNotificationEnabled()
      ? [new CapabilityAddCommandAndResponse(), new CapabilityAddNotification()]
      : [new CapabilityAddBot()]),
    new CapabilityAddMessageExtension(),
    new CapabilityAddTab(),

    // Category 2: Add Cloud Resources
    new ResourceAddFunction(),
    new ResourceAddSql(),
    new ResourceAddApim(),
    new ResourceAddKeyVault(),

    // Category 3: Standalone features
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
