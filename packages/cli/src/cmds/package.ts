// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Argv } from "yargs";
import path from "path";
import {
  FxError,
  err,
  ok,
  Result,
  Func,
  AppPackageFolderName,
  BuildFolderName,
} from "@microsoft/teamsfx-api";
import { isV3Enabled, environmentManager } from "@microsoft/teamsfx-core";
import { CoreQuestionNames } from "@microsoft/teamsfx-core/build/core/question";
import activate from "../activate";
import {
  RootFolderOptions,
  EnvOptions,
  BuildPackageOptions,
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

export default class Package extends YargsCommand {
  public readonly commandHead = `package`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Build your Teams app into a package for publishing.";

  public builder(yargs: Argv): Argv<any> {
    if (isV3Enabled()) yargs.options(RootFolderOptions).options(BuildPackageOptions);
    else yargs.options(RootFolderOptions);
    return yargs.hide("interactive").version(false).options(EnvOptions);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.BuildStart);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Build, result.error);
      return err(result.error);
    }
    const core = result.value;
    const inputs = getSystemInputs(rootFolder, args.env);
    inputs.ignoreEnvInfo = false;
    {
      let result;
      if (isV3Enabled()) {
        inputs[CoreQuestionNames.TeamsAppManifestFilePath] =
          args[ManifestFilePathParamName] ?? `${rootFolder}/${AppPackageFolderName}/manifest.json`;
        inputs[CoreQuestionNames.OutputZipPathParamName] =
          args[CoreQuestionNames.OutputZipPathParamName] ??
          `${rootFolder}/${BuildFolderName}/${AppPackageFolderName}/appPackage.${inputs.env}.zip`;
        inputs[CoreQuestionNames.OutputManifestParamName] =
          args[CoreQuestionNames.OutputManifestParamName] ??
          `${rootFolder}/${BuildFolderName}/${AppPackageFolderName}/manifest.${inputs.env}.json`;
        result = await core.createAppPackage(inputs);
      } else {
        const func: Func = {
          namespace: "fx-solution-azure",
          method: "buildPackage",
          params: {
            type: inputs.env === environmentManager.getLocalEnvName() ? "localDebug" : "remote",
          },
        };
        result = await core.executeUserTask!(func, inputs);
      }

      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(
          TelemetryEvent.Build,
          result.error,
          makeEnvRelatedProperty(rootFolder, inputs)
        );

        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.Build, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...makeEnvRelatedProperty(rootFolder, inputs),
    });
    return ok(null);
  }
}
