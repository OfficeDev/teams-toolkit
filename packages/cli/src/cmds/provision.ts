// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";

import { FxError, err, ok, Result, Stage } from "@microsoft/teamsfx-api";

import activate from "../activate";
import * as constants from "../constants";
import { validateAndUpdateAnswers } from "../question/question";
import { argsToInputs, getParamJson, setSubscriptionId } from "../utils";
import { YargsCommand } from "../yargsCommand";
import CliTelemetry from "../telemetry/cliTelemetry";
import { TelemetryEvent, TelemetryProperty, TelemetrySuccess } from "../telemetry/cliTelemetryEvents";

export default class Provision extends YargsCommand {
  public readonly commandHead = `provision`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Provision the cloud resources in the current application.";
  public readonly paramPath = constants.provisionParamPath;

  public readonly params: { [_: string]: Options } = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const answers = argsToInputs(this.params, args);
    CliTelemetry.withRootFolder(answers.projectPath).sendTelemetryEvent(TelemetryEvent.ProvisionStart);

    {
      const result = await setSubscriptionId(args.subscription, answers.projectPath);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Provision, result.error);
        return result;
      }
    }

    const result = await activate(answers.projectPath);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Provision, result.error);
      return err(result.error);
    }

    const core = result.value;
    {
      const result = await core.getQuestions!(Stage.provision, answers);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Provision, result.error);
        return err(result.error);
      }
      await validateAndUpdateAnswers(result.value, answers);
    }

    {
      const result = await core.provisionResources(answers);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Provision, result.error);
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.Provision, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes
    });
    return ok(null);
  }
}
