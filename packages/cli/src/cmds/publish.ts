// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, err, ok } from "@microsoft/teamsfx-api";
import { getHashedEnv } from "@microsoft/teamsfx-core";
import path from "path";
import { Argv } from "yargs";
import activate from "../activate";
import { RootFolderOptions, EnvOptions } from "../constants";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { getSystemInputs, askTargetEnvironment, getTeamsAppTelemetryInfoByEnv } from "../utils";
import { YargsCommand } from "../yargsCommand";

export default class Publish extends YargsCommand {
  public readonly commandHead = `publish`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Publish the app to Teams.";

  public builder(yargs: Argv): Argv<any> {
    return yargs.version(false).options(RootFolderOptions).options(EnvOptions);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const inputs = getSystemInputs(args.folder, args.env);
    if (!inputs.env) {
      // include local env in interactive question
      const selectedEnv = await askTargetEnvironment(inputs.projectPath!);
      if (selectedEnv.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Publish, selectedEnv.error);
        return err(selectedEnv.error);
      }
      inputs.env = selectedEnv.value;
    }

    const properties: { [key: string]: string } = {};
    if (inputs.env) {
      properties[TelemetryProperty.Env] = getHashedEnv(inputs.env);
    }
    if (inputs.projectPath && inputs.env) {
      const appInfo = getTeamsAppTelemetryInfoByEnv(inputs.projectPath, inputs.env);
      if (appInfo) {
        properties[TelemetryProperty.AppId] = appInfo.appId;
        properties[TelemetryProperty.TenantId] = appInfo.tenantId;
      }
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
