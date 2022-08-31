// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import path from "path";
import { Argv } from "yargs";

import { FxError, err, ok, Result, Stage, Void } from "@microsoft/teamsfx-api";

import activate from "../activate";
import { getSystemInputs, setSubscriptionId } from "../utils";
import { YargsCommand } from "../yargsCommand";
import CliTelemetry, { makeEnvRelatedProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import HelpParamGenerator from "../helpParamGenerator";
import { sqlPasswordConfirmQuestionName, sqlPasswordQustionName } from "../constants";

export class ProvisionManifest extends YargsCommand {
  public readonly commandHead = "manifest";
  public readonly command = this.commandHead;
  public readonly description =
    "Provision a Teams App in Teams Developer portal with corresponding information specified in the given manifest file";

  public readonly filePathParam = "file-path";

  builder(yargs: Argv): Argv<any> {
    yargs.option(this.filePathParam, {
      require: true,
      description: "Path to the Teams App manifest zip package",
      type: "string",
    });
    return yargs.version(false);
  }

  async runCommand(args: { [argName: string]: string }): Promise<Result<any, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(
      TelemetryEvent.ProvisionManifestStart
    );

    const manifestFilePath = args[this.filePathParam];
    const inputs = getSystemInputs(rootFolder, args.env);
    inputs["appPackagePath"] = manifestFilePath;

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ProvisionManifest, result.error);
      return err(result.error);
    }

    const core = result.value;
    const provisionResult = await core.provisionTeamsAppForCLI(inputs);
    if (provisionResult.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ProvisionManifest, provisionResult.error);

      return err(provisionResult.error);
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.ProvisionManifest, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.AppId]: provisionResult.value,
    });
    return ok(Void);
  }
}

export default class Provision extends YargsCommand {
  public readonly commandHead = `provision`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Provision the cloud resources in the current application.";
  public readonly resourceGroupParam = "resource-group";
  public readonly subscriptionParam = "subscription";
  public readonly subCommands = [new ProvisionManifest()];

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp(Stage.provision);
    yargs.option(this.resourceGroupParam, {
      require: false,
      description: "The name of an existing resource group",
      type: "string",
      global: false,
    });

    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs.version(false).options(this.params);
  }

  public override modifyArguments(args: { [argName: string]: any }): { [argName: string]: any } {
    if (sqlPasswordQustionName in args) {
      args[sqlPasswordConfirmQuestionName] = args[sqlPasswordQustionName];
    }
    return args;
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.ProvisionStart);

    {
      const result = await setSubscriptionId(args.subscription, rootFolder);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Provision, result.error);
        return result;
      }
    }
    const inputs = getSystemInputs(rootFolder, args.env);

    if (this.resourceGroupParam in args) {
      inputs.targetResourceGroupName = args[this.resourceGroupParam];
    }

    if (this.subscriptionParam in args) {
      inputs.targetSubscriptionId = args[this.subscriptionParam];
    }

    const result = await activate(rootFolder, true);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Provision, result.error);
      return err(result.error);
    }

    const core = result.value;
    {
      const result = await core.provisionResources(inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(
          TelemetryEvent.Provision,
          result.error,
          makeEnvRelatedProperty(rootFolder, inputs)
        );
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.Provision, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvRelatedProperty(rootFolder, inputs),
    });
    return ok(null);
  }
}
