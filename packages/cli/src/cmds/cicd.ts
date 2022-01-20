// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import { Argv } from "yargs";
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

export default class CICD extends YargsCommand {
  public readonly commandHead = `cicd`;
  public readonly command = this.commandHead;
  public readonly description = "Add CI/CD Workflows for GitHub, Azure DevOps or Jenkins.";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp("addCICDWorkflows");
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.CICDStart);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CICD, result.error);
      return err(result.error);
    }
    const core = result.value;
    let inputs: Inputs;
    {
      const func: Func = {
        namespace: "fx-solution-azure/fx-resource-cicd",
        method: "addCICDWorkflows",
      };

      inputs = getSystemInputs(rootFolder, args.env as any);
      const result = await core.executeUserTask!(func, inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CICD, result.error);
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.CICD, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvProperty(inputs.env),
    });
    return ok(null);
  }
}
