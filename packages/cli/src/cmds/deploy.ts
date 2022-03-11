// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import { Argv, Options } from "yargs";

import {
  FxError,
  err,
  ok,
  Result,
  Stage,
  Inputs,
  MultiSelectQuestion,
  OptionItem,
  Func,
} from "@microsoft/teamsfx-api";

import activate from "../activate";
import { YargsCommand } from "../yargsCommand";
import { flattenNodes, getSystemInputs, toLocaleLowerCase } from "../utils";
import CliTelemetry, { makeEnvRelatedProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import CLIUIInstance from "../userInteraction";
import HelpParamGenerator from "../helpParamGenerator";
import * as constants from "../constants";

export default class Deploy extends YargsCommand {
  public readonly commandHead = `deploy`;
  public readonly command = `${this.commandHead} [components...]`;
  public readonly description = "Deploy the current application.";

  public readonly deployPluginNodeName = constants.deployPluginNodeName;
  public readonly subCommands: YargsCommand[] = [new DeployManifest()];

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp(Stage.deploy);
    const deployPluginOption = this.params[this.deployPluginNodeName];
    yargs.positional("components", {
      array: true,
      choices: deployPluginOption.choices,
      description: deployPluginOption.description,
      coerce: toLocaleLowerCase,
    });
    for (const name in this.params) {
      if (name !== this.deployPluginNodeName) {
        yargs.options(name, this.params[name]);
      }
    }

    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });

    return yargs.version(false);
  }

  public async runCommand(args: {
    [argName: string]: string | string[] | undefined;
  }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.DeployStart);

    CLIUIInstance.removePresetAnswers(["components"]);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Deploy, result.error);
      return err(result.error);
    }

    const core = result.value;

    let inputs: Inputs;
    {
      inputs = getSystemInputs(rootFolder, args.env as any);
      {
        const root = HelpParamGenerator.getQuestionRootNodeForHelp(Stage.deploy);
        const questions = flattenNodes(root!);
        const question = questions.find((q) => q.data.name === this.deployPluginNodeName);
        const choices = (question?.data as MultiSelectQuestion).staticOptions;
        let ids: string[];
        if (typeof choices[0] === "string") {
          ids = choices as string[];
        } else {
          ids = (choices as OptionItem[]).map((choice) => choice.id);
        }
        const components = (args.components as string[]) || [];
        const options = this.params[this.deployPluginNodeName].choices as string[];
        const indexes = components.map((c) => options.findIndex((op) => op === c));
        if (components.length === 0) {
          inputs[this.deployPluginNodeName] = ids;
        } else {
          inputs[this.deployPluginNodeName] = indexes.map((i) => ids[i]);
        }
      }
      const result = await core.deployArtifacts(inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(
          TelemetryEvent.Deploy,
          result.error,
          makeEnvRelatedProperty(rootFolder, inputs)
        );

        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.Deploy, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvRelatedProperty(rootFolder, inputs),
    });
    return ok(null);
  }
}

class DeployManifest extends YargsCommand {
  public readonly commandHead = "manifest";
  public readonly command = this.commandHead;
  public readonly description = "Synchronize manifest changes to Teams.";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp("update");
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.UpdateManifestStart);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateManifest, result.error);
      return err(result.error);
    }
    const core = result.value;
    let inputs: Inputs;
    {
      const func: Func = {
        namespace: "fx-solution-azure/fx-resource-appstudio",
        method: "updateManifest",
      };

      inputs = getSystemInputs(rootFolder, args.env as any);
      const result = await core.executeUserTask!(func, inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(
          TelemetryEvent.UpdateManifest,
          result.error,
          makeEnvRelatedProperty(rootFolder, inputs)
        );

        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateManifest, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvRelatedProperty(rootFolder, inputs),
    });
    return ok(null);
  }
}
