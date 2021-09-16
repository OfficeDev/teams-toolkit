// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import path from "path";
import { Argv, Options } from "yargs";

import { FxError, err, ok, Result, Stage } from "@microsoft/teamsfx-api";

import activate from "../activate";
import { getSystemInputs, setSubscriptionId } from "../utils";
import { YargsCommand } from "../yargsCommand";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import CLIUIInstance from "../userInteraction";
import HelpParamGenerator from "../helpParamGenerator";
import { sqlPasswordConfirmQuestionName, sqlPasswordQustionName } from "../constants";
import { isMultiEnvEnabled } from "@microsoft/teamsfx-core";

export default class Provision extends YargsCommand {
  public readonly commandHead = `provision`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Provision the cloud resources in the current application.";
  public readonly resourceGroupParam = "resource-group";

  public params: { [_: string]: Options } = {};

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp(Stage.provision);
    if (isMultiEnvEnabled()) {
      yargs.option(this.resourceGroupParam, {
        require: false,
        description: "The name of an existing resource group",
        type: "string",
      });
    }
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.ProvisionStart);
    if (sqlPasswordQustionName in args) {
      args[sqlPasswordConfirmQuestionName] = args[sqlPasswordQustionName];
    }
    CLIUIInstance.updatePresetAnswers(this.params, args);

    {
      const result = await setSubscriptionId(args.subscription, rootFolder);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Provision, result.error);
        return result;
      }
    }
    const inputs = getSystemInputs(rootFolder, args.env);

    if (isMultiEnvEnabled()) {
      if (this.resourceGroupParam in args) {
        inputs.targetResourceGroupName = args[this.resourceGroupParam];
      }
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
    });
    return ok(null);
  }
}
