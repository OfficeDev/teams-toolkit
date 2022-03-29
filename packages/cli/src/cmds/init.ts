// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";
import { FxError, err, ok, Result, Stage } from "@microsoft/teamsfx-api";
import activate from "../activate";
import { YargsCommand } from "../yargsCommand";
import { getSystemInputs } from "../utils";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import HelpParamGenerator from "../helpParamGenerator";
import * as uuid from "uuid";
import * as fs from "fs-extra";
import * as path from "path";
import { NotFoundInputedFolder } from "../error";

export default class Init extends YargsCommand {
  public readonly commandHead = `init`;
  public readonly command = this.commandHead;
  public readonly description = "Initialize your workspace.";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp(Stage.init);
    if (this.params) {
      yargs.options(this.params);
    }
    return yargs.version(false);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.InitProjectStart);

    if (!(await fs.pathExists(rootFolder))) {
      CliTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.InitProject,
        NotFoundInputedFolder(rootFolder)
      );
      return err(NotFoundInputedFolder(rootFolder));
    }

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.InitProject, result.error);
      return err(result.error);
    }

    const core = result.value;
    const inputs = getSystemInputs(rootFolder);
    inputs.projectId = inputs.projectId ?? uuid.v4();
    inputs.folder = inputs.folder ?? rootFolder;

    const initResult = await core.init(inputs);
    if (initResult.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.InitProject, initResult.error);
      return err(initResult.error);
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.InitProject, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.NewProjectId]: inputs.projectId,
    });
    return ok(null);
  }
}
