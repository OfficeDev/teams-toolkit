// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";
import * as path from "path";
import { FxError, err, ok, Result, Func, Inputs } from "@microsoft/teamsfx-api";
import activate from "../activate";
import { YargsCommand } from "../yargsCommand";
import { getSystemInputs } from "../utils";
import CliTelemetry, { makeEnvProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import HelpParamGenerator from "../helpParamGenerator";

export default class Validate extends YargsCommand {
  public readonly commandHead = `validate`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Validate the current application.";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp("validate");
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(
      TelemetryEvent.ValidateManifestStart
    );

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ValidateManifest, result.error);
      return err(result.error);
    }
    const core = result.value;
    let inputs: Inputs;
    {
      const func: Func = {
        namespace: "fx-solution-azure",
        method: "validateManifest",
      };

      inputs = getSystemInputs(rootFolder, args.env as any);
      const result = await core.executeUserTask!(func, inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ValidateManifest, result.error);
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.ValidateManifest, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvProperty(inputs.env),
    });
    return ok(null);
  }
}
