// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import { hooks } from "@feathersjs/hooks/lib";
import {
  Context,
  err,
  FxError,
  Inputs,
  ok,
  Platform,
  Result,
  UserError,
} from "@microsoft/teamsfx-api";
import { Generator } from "../generator";
import path from "path";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { TelemetryEvents } from "../spfx/utils/telemetryEvents";
import { SpecParser } from "../../../common/spec-parser/specParser";
import { QuestionNames } from "../../../question/questionNames";
import {
  logValidationResults,
  OpenAIPluginManifestHelper,
  validateTeamsManifestLength,
} from "./helper";
import { ValidationStatus } from "../../../common/spec-parser/interfaces";
import { getLocalizedString } from "../../../common/localizeUtils";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";
import { ProgrammingLanguage } from "../../../question";
import * as fs from "fs-extra";
import { assembleError } from "../../../error";

const componentName = "simplified-message-extension-existing-api";
const templateName = "simplified-message-extension-existing-api";
const appPackageName = "appPackage";
const manifestFileName = "manifest.json";
const adaptiveFolderName = "adaptiveCards";
const apiSpecFolderName = "apiSpecFiles";
const apiSpecYamlFileName = "openapi.yaml";
const apiSpecJsonFileName = "openapi.json";

const invalidApiSpecErrorName = "invalid-api-spec";

export class CopilotPluginGenerator {
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: componentName,
      telemetryEventName: TelemetryEvents.Generate,
      errorSource: componentName,
    }),
  ])
  public static async generate(
    context: Context,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<undefined, FxError>> {
    try {
      // download template
      const templateRes = await Generator.generateTemplate(
        context,
        destinationPath,
        templateName,
        inputs[QuestionNames.ProgrammingLanguage] === ProgrammingLanguage.CSharp
          ? ProgrammingLanguage.CSharp
          : undefined
      );
      if (templateRes.isErr()) return err(templateRes.error);

      const url = inputs[QuestionNames.ApiSpecLocation] ?? inputs.openAIPluginManifest?.api.url;

      const specParser = new SpecParser(url);
      const validationRes = await specParser.validate();
      const warnings = validationRes.warnings;
      logValidationResults(validationRes.errors, warnings, context, true, false, true);
      if (validationRes.status === ValidationStatus.Error) {
        const errorMessage =
          inputs!.platform === Platform.VSCode
            ? getLocalizedString(
                "core.createProjectQuestion.apiSpec.multipleValidationErrors.vscode.message"
              )
            : getLocalizedString(
                "core.createProjectQuestion.apiSpec.multipleValidationErrors.message"
              );
        return err(
          new UserError(componentName, invalidApiSpecErrorName, errorMessage, errorMessage)
        );
      }

      const manifestPath = path.join(destinationPath, appPackageName, manifestFileName);
      const filters = inputs[QuestionNames.ApiOperation] as string[];

      const apiSpecFolderPath = path.join(destinationPath, appPackageName, apiSpecFolderName);
      await fs.ensureDir(apiSpecFolderPath);

      const openapiSpecPath = path.join(apiSpecFolderPath, apiSpecYamlFileName);
      await specParser.generate(manifestPath, filters, openapiSpecPath, adaptiveFolderName);

      // update manifest based on openAI plugin manifest
      const manifestRes = await manifestUtils._readAppManifest(manifestPath);

      if (manifestRes.isErr()) {
        return err(manifestRes.error);
      }

      const teamsManifest = manifestRes.value;
      if (inputs.openAIPluginManifest) {
        const updateManifestRes = await OpenAIPluginManifestHelper.updateManifest(
          inputs.openAIPluginManifest,
          teamsManifest,
          manifestPath
        );
        if (updateManifestRes.isErr()) return err(updateManifestRes.error);
      }

      // check Teams manifest
      const manifestWarnings = validateTeamsManifestLength(teamsManifest);

      // TODO: format log warnings
      for (const warn of warnings) {
        context.logProvider.warning(warn.content);
      }
      for (const warn of manifestWarnings) {
        context.logProvider.warning(warn);
      }
      return ok(undefined);
    } catch (e) {
      const error = assembleError(e);
      return err(error);
    }
  }
}
