// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";
import * as path from "path";
import { FxError, err, ok, Result, Func, Inputs } from "@microsoft/teamsfx-api";
import activate from "../activate";
import * as constants from "../constants";
import { YargsCommand } from "../yargsCommand";
import { getParamJson, getSystemInputs } from "../utils";
import CliTelemetry from "../telemetry/cliTelemetry";
import { TelemetryEvent, TelemetryProperty, TelemetrySuccess } from "../telemetry/cliTelemetryEvents";

export default class Build extends YargsCommand {
  public readonly commandHead = `build`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Build the current application.";
  public readonly paramPath = constants.buildParamPath;

  public readonly params: { [_: string]: Options } = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const answers:Inputs = getSystemInputs();
    for (const name in this.params) {
      if (!args[name]) {
        continue;
      }
      if (name.endsWith("folder")) {
        answers[name] = path.resolve(args[name] as string);
      } else {
        answers[name] = args[name];
      }
    }
 
    const rootFolder = path.resolve(answers["folder"]as string || "./");
    delete answers.folder;
    answers.projectPath = rootFolder;
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.BuildStart);
    
    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Build, result.error);
      return err(result.error);
    }
    const core = result.value;
    {
      const func: Func = {
        namespace: "fx-solution-azure",
        method: "buildPackage"
      };
      const result = await core.executeUserTask!(func, answers);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Build, result.error);
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.Build, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes
    });
    return ok(null);
  }
}
