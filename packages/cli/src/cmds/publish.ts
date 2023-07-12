// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import { getHashedEnv } from "@microsoft/teamsfx-core";
import { Argv } from "yargs";
import activate from "../activate";
import { EnvOptions, RootFolderOptions } from "../constants";
import { strings } from "../resource";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";

export default class Publish extends YargsCommand {
  public readonly commandHead = `publish`;
  public readonly command = `${this.commandHead}`;
  public readonly description = strings.command.publish.description;

  public builder(yargs: Argv): Argv<any> {
    return yargs.version(false).options(RootFolderOptions).options(EnvOptions);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const inputs = getSystemInputs(args.folder, args.env);

    const properties: { [key: string]: string } = {};
    if (inputs.env) {
      properties[TelemetryProperty.Env] = getHashedEnv(inputs.env);
    }

    const rootFolder = inputs.projectPath!;
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(
      TelemetryEvent.PublishStart,
      properties
    );
    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Publish, result.error, properties);
      return err(result.error);
    }
    const core = result.value;
    {
      const result = await core.publishApplication(inputs);

      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Publish, result.error, properties);
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.Publish, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...properties,
    });

    return ok(null);
  }
}
