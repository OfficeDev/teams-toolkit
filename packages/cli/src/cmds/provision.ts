// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import path from "path";
import { Argv } from "yargs";
import activate from "../activate";
import { EnvOptions, RootFolderOptions } from "../constants";
import { strings } from "../resource";
import CliTelemetry, { makeEnvRelatedProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";

export default class Provision extends YargsCommand {
  public readonly commandHead = `provision`;
  public readonly command = `${this.commandHead}`;
  public readonly description = strings.command.provision.description;

  public builder(yargs: Argv): Argv<any> {
    return yargs.hide("interactive").version(false).options(EnvOptions).options(RootFolderOptions);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.ProvisionStart);

    const inputs = getSystemInputs(rootFolder, args.env);
    const result = await activate(rootFolder, true);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Provision, result.error);
      return err(result.error);
    }

    const core = result.value;
    {
      const result = await core.provisionResources(inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(
          TelemetryEvent.Provision,
          result.error,
          makeEnvRelatedProperty(rootFolder, inputs)
        );
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.Provision, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvRelatedProperty(rootFolder, inputs),
    });
    return ok(null);
  }
}
