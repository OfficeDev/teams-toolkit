// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";
import * as path from "path";
import { FxError, err, ok, Result, ConfigMap, Platform, Func } from "@microsoft/teamsfx-api";
import activate from "../activate";
import * as constants from "../constants";
import { YargsCommand } from "../yargsCommand";
import { argsToInputs, getParamJson } from "../utils";
import CliTelemetry from "../telemetry/cliTelemetry";
import { TelemetryEvent, TelemetryProperty, TelemetrySuccess } from "../telemetry/cliTelemetryEvents";

export default class Validate extends YargsCommand {
  public readonly commandHead = `validate`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Validate the current application.";
  public readonly paramPath = constants.validateParamPath;

  public readonly params: { [_: string]: Options } = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const answers = argsToInputs(this.params, args);
    CliTelemetry.withRootFolder(answers.projectPath).sendTelemetryEvent(TelemetryEvent.ValidateManifestStart);
    const result = await activate(answers.projectPath);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ValidateManifest, result.error);
      return err(result.error);
    }
    const core = result.value;
    {
      const func: Func = {
        namespace: "fx-solution-azure",
        method: "validateManifest"
      };
      const result = await core.executeUserTask!(func, answers);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ValidateManifest, result.error);
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.ValidateManifest, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes
    });
    return ok(null);
  }
}
