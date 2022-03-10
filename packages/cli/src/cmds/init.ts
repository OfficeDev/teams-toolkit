// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";
import * as path from "path";
import { FxError, err, ok, Result, Inputs } from "@microsoft/teamsfx-api";
import activate from "../activate";
import { YargsCommand } from "../yargsCommand";
import { getSystemInputs } from "../utils";
import CliTelemetry, { makeEnvRelatedProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import HelpParamGenerator from "../helpParamGenerator";

export class InitCommand extends YargsCommand {
  public readonly commandHead = `init`;
  public readonly command = this.commandHead;
  public readonly description = "Initialize an existing application.";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp("init");
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.InitStart);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Init, result.error);
      return err(result.error);
    }
    const core = result.value;
    const inputs: Inputs = getSystemInputs(rootFolder);
    const initResult = await core.init(inputs);

    if (initResult.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.Init,
        initResult.error,
        makeEnvRelatedProperty(rootFolder, inputs)
      );

      return err(initResult.error);
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.Init, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvRelatedProperty(rootFolder, inputs),
    });
    return ok(null);
  }
}
