// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";
import path from "path";
import {
  FxError,
  err,
  ok,
  Result,
  Func,
  TemplateFolderName,
  AppPackageFolderName,
  BuildFolderName,
} from "@microsoft/teamsfx-api";
import { isV3Enabled, environmentManager } from "@microsoft/teamsfx-core";
import activate from "../activate";
import {
  RootFolderOptions,
  EnvOptions,
  BuildPackageOptions,
  ManifestFilePathParamName,
  OutputZipPathParamName,
  OutputManifestParamName,
} from "../constants";
import CliTelemetry, { makeEnvRelatedProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { getSystemInputs, askTargetEnvironment } from "../utils";
import { YargsCommand } from "../yargsCommand";

export default class Package extends YargsCommand {
  public readonly commandHead = `package`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Build your Teams app into a package for publishing.";

  public builder(yargs: Argv): Argv<any> {
    if (isV3Enabled()) yargs.options(BuildPackageOptions);
    return yargs.version(false).options(RootFolderOptions).options(EnvOptions);
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
      const func: Func = {
        namespace: "fx-solution-azure",
        method: "buildPackage",
        params: {},
      };

      // TODO: remove when V3 is auto enabled
      if (!inputs.env) {
        // include local env in interactive question
        const selectedEnv = await askTargetEnvironment(rootFolder);
        if (selectedEnv.isErr()) {
          CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Build, selectedEnv.error);
          return err(selectedEnv.error);
        }
        inputs.env = selectedEnv.value;
      }

      if (isV3Enabled()) {
        func.params = {
          manifestTemplatePath:
            args[ManifestFilePathParamName] ??
            `${rootFolder}/${AppPackageFolderName}/manifest.template.json`,
          ouptutZipPath:
            args[OutputZipPathParamName] ??
            `${rootFolder}/${BuildFolderName}/${AppPackageFolderName}/appPackage.${inputs.env}.zip`,
          outputJsonPath:
            args[OutputManifestParamName] ??
            `${rootFolder}/${BuildFolderName}/${AppPackageFolderName}/manifest.${inputs.env}.json`,
          env: inputs.env,
        };
      } else {
        func.params.type =
          inputs.env === environmentManager.getLocalEnvName() ? "localDebug" : "remote";
      }

      const result = await core.executeUserTask!(func, inputs);
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
