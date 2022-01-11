// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import path from "path";
import { Argv } from "yargs";

import { FxError, err, ok, Result, Stage } from "@microsoft/teamsfx-api";

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

export default class Provision extends YargsCommand {
  public readonly commandHead = `provision`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Provision the cloud resources in the current application.";
  public readonly resourceGroupParam = "resource-group";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp(Stage.provision);
    yargs.option(this.resourceGroupParam, {
      require: false,
      description: "The name of an existing resource group",
      type: "string",
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

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Provision, result.error);
      return err(result.error);
    }

    const core = result.value;
    {
      const result = await core.provisionResources(inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Provision, result.error);
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
