// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, err, AppPackageFolderName, ok, Func } from "@microsoft/teamsfx-api";
import { environmentManager, isV3Enabled } from "@microsoft/teamsfx-core";
import path from "path";
import { Argv } from "yargs";
import activate from "../activate";
import {
  RootFolderOptions,
  EnvOptions,
  ManifestFilePathParamName,
  BuildPackageOptions,
} from "../constants";
import CliTelemetry, { makeEnvRelatedProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { askTargetEnvironment, getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";

export class ManifestValidate extends YargsCommand {
  public readonly commandHead = `validate`;
  public readonly command = this.commandHead;
  public readonly description = "Validate the Teams app manifest.";

  public builder(yargs: Argv): Argv<any> {
    if (isV3Enabled())
      yargs.options(RootFolderOptions).options({
        [ManifestFilePathParamName]: BuildPackageOptions[ManifestFilePathParamName],
      });
    else yargs.options(RootFolderOptions);
    return yargs.hide("interactive").version(false).options(RootFolderOptions).options(EnvOptions);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
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
    const inputs = getSystemInputs(rootFolder, args.env);
    inputs.ignoreEnvInfo = false;
    {
      // TODO: remove when V3 is auto enabled
      if (!inputs.env) {
        // include local env in interactive question
        const selectedEnv = await askTargetEnvironment(rootFolder);
        if (selectedEnv.isErr()) {
          CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ValidateManifest, selectedEnv.error);
          return err(selectedEnv.error);
        }
        inputs.env = selectedEnv.value;
      }

      const func: Func = {
        namespace: "fx-solution-azure",
        method: "validateManifest",
        params: {
          type: inputs.env === environmentManager.getLocalEnvName() ? "localDebug" : "remote",
        },
      };

      if (isV3Enabled()) {
        func.params = {
          manifestPath:
            args[ManifestFilePathParamName] ??
            `${rootFolder}/${AppPackageFolderName}/manifest.json`,
        };
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
