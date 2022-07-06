// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";
import * as path from "path";
import { FxError, err, ok, Result, Func, Inputs } from "@microsoft/teamsfx-api";
import activate from "../activate";
import { YargsCommand } from "../yargsCommand";
import { getSystemInputs, askTargetEnvironment } from "../utils";
import CliTelemetry, { makeEnvRelatedProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import HelpParamGenerator from "../helpParamGenerator";
import { environmentManager } from "@microsoft/teamsfx-core";

export class ManifestValidate extends YargsCommand {
  public readonly commandHead = `validate`;
  public readonly command = this.commandHead;
  public readonly description = "Validate the Teams app manifest.";

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
        params: {},
      };

      if (!args.env) {
        // include local env in interactive question
        const selectedEnv = await askTargetEnvironment(rootFolder);
        if (selectedEnv.isErr()) {
          CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ValidateManifest, selectedEnv.error);
          return err(selectedEnv.error);
        }
        args.env = selectedEnv.value;
      }

      if (args.env === environmentManager.getLocalEnvName()) {
        func.params.type = "localDebug";
        inputs = getSystemInputs(rootFolder);
        inputs.ignoreEnvInfo = false;
        inputs.env = args.env;
      } else {
        func.params.type = "remote";
        inputs = getSystemInputs(rootFolder, args.env as any);
        inputs.ignoreEnvInfo = false;
      }

      const result = await core.executeUserTask!(func, inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(
          TelemetryEvent.ValidateManifest,
          result.error,
          makeEnvRelatedProperty(rootFolder, inputs)
        );

        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.ValidateManifest, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvRelatedProperty(rootFolder, inputs),
    });
    return ok(null);
  }
}
