// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import {
  CoreQuestionNames,
  validateAppPackageOption,
  validateSchemaOption,
} from "@microsoft/teamsfx-core";
import path from "path";
import { Argv } from "yargs";
import activate from "../activate";
import {
  AppPackageFilePathParamName,
  EnvOptions,
  ManifestFilePathParamName,
  RootFolderOptions,
  ValidateApplicationOptions,
} from "../constants";
import { ArgumentConflictError, MissingRequiredArgumentError } from "../error";
import { globals } from "../globals";
import CliTelemetry, { makeEnvRelatedProperty } from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import CLIUIInstance from "../userInteraction";
import { getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";

export class ManifestValidate extends YargsCommand {
  public readonly commandHead = `validate`;
  public readonly command = this.commandHead;
  public readonly description = "Validate the Teams app using manifest schema or validation rules.";

  public builder(yargs: Argv): Argv<any> {
    globals.options = ["manifest-file-path", "app-package-file-path", "env"];
    return yargs
      .hide("interactive")
      .version(false)
      .options(ValidateApplicationOptions)
      .options(RootFolderOptions)
      .options(EnvOptions);
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
      const validateArgsResult = this.validateArgs(args);
      if (validateArgsResult.isErr()) {
        return err(validateArgsResult.error);
      }
      if (!CLIUIInstance.interactive) {
        if (args[AppPackageFilePathParamName]) {
          inputs[CoreQuestionNames.ValidateMethod] = validateAppPackageOption.id;
          inputs[CoreQuestionNames.TeamsAppPackageFilePath] = args[AppPackageFilePathParamName];
        } else {
          inputs[CoreQuestionNames.ValidateMethod] = validateSchemaOption.id;
          inputs[CoreQuestionNames.TeamsAppManifestFilePath] = args[ManifestFilePathParamName];
        }
      }
      const result = await core.validateApplication(inputs);
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

  private validateArgs(args: { [argName: string]: string }): Result<any, FxError> {
    // Throw error when --manifest-path and --app-package-file-path are both provided
    if (args[AppPackageFilePathParamName] && args[ManifestFilePathParamName]) {
      const error = new ArgumentConflictError(
        "teamsfx validate",
        AppPackageFilePathParamName,
        ManifestFilePathParamName
      );
      return err(error);
    }

    // Throw error if --env not specified
    if (args[ManifestFilePathParamName] && !args.env && !CLIUIInstance.interactive) {
      const error = new MissingRequiredArgumentError("teamsfx validate", "env");
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateAadApp, error);
      return err(error);
    }

    return ok(undefined);
  }
}
