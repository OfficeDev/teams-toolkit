// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, err, AppPackageFolderName, ok, Func } from "@microsoft/teamsfx-api";
import { environmentManager, isV3Enabled } from "@microsoft/teamsfx-core";
import { CoreQuestionNames } from "@microsoft/teamsfx-core/build/core/question";
import path from "path";
import { Argv } from "yargs";
import activate from "../activate";
import {
  RootFolderOptions,
  EnvOptions,
  ValidateApplicationOptions,
  AppPackageFilePathParamName,
  ManifestFilePathParamName,
} from "../constants";
import CliTelemetry, { makeEnvRelatedProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";

export class ManifestValidate extends YargsCommand {
  public readonly commandHead = `validate`;
  public readonly command = this.commandHead;
  public readonly description = "Validate the Teams app using manifest schema or validation rules.";

  public builder(yargs: Argv): Argv<any> {
    if (isV3Enabled()) yargs.options(RootFolderOptions).options(ValidateApplicationOptions);
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
      let result;

      if (isV3Enabled()) {
        if (args[AppPackageFilePathParamName]) {
          inputs.validateMethod = "validateAgainstAppPackage";
          inputs[CoreQuestionNames.TeamsAppPackageFilePath] = args[AppPackageFilePathParamName];
        } else {
          inputs.validateMethod = "validateAgainstSchema";
          inputs[CoreQuestionNames.TeamsAppManifestFilePath] =
            args[ManifestFilePathParamName] ??
            `${rootFolder}/${AppPackageFolderName}/manifest.json`;
        }
        result = await core.validateApplication(inputs);
      } else {
        const func: Func = {
          namespace: "fx-solution-azure",
          method: "validateManifest",
          params: {
            type: inputs.env === environmentManager.getLocalEnvName() ? "localDebug" : "remote",
          },
        };
        result = await core.executeUserTask!(func, inputs);
      }

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
