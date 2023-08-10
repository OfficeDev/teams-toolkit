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
  ManifestTemplateFileName,
  ok,
  Platform,
  Result,
  UserError,
  AdaptiveFolderName,
  AppPackageFolderName,
  Warning,
} from "@microsoft/teamsfx-api";
import { Generator } from "../generator";
import path from "path";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { TelemetryEvents } from "../spfx/utils/telemetryEvents";
import { SpecParser } from "../../../common/spec-parser/specParser";
import { QuestionNames } from "../../../question/questionNames";
import {
  convertSpecParserErrorToFxError,
  generateScaffoldingSummary,
  logValidationResults,
  OpenAIPluginManifestHelper,
} from "./helper";
import { ValidationStatus, WarningType } from "../../../common/spec-parser/interfaces";
import { getLocalizedString } from "../../../common/localizeUtils";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";
import { ProgrammingLanguage } from "../../../question/create";
import * as fs from "fs-extra";
import { assembleError } from "../../../error";
import { isYamlSpecFile } from "../../../common/spec-parser/utils";
import { ConstantString } from "../../../common/spec-parser/constants";
import * as util from "util";
import { SpecParserError } from "../../../common/spec-parser/specParserError";

const componentName = "simplified-message-extension-existing-api";
const templateName = "simplified-message-extension-existing-api";
const manifestFileName = ManifestTemplateFileName;
const apiSpecFolderName = "apiSpecFiles";
const apiSpecYamlFileName = "openapi.yaml";
const apiSpecJsonFileName = "openapi.json";

const invalidApiSpecErrorName = "invalid-api-spec";

export interface CopilotPluginGeneratorResult {
  warnings?: Warning[];
}

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
  ): Promise<Result<CopilotPluginGeneratorResult, FxError>> {
    try {
      const appName = inputs[QuestionNames.AppName];
      const language = inputs[QuestionNames.ProgrammingLanguage];
      const safeProjectNameFromVS =
        language === "csharp" ? inputs[QuestionNames.SafeProjectName] : undefined;
      context.templateVariables = Generator.getDefaultVariables(appName, safeProjectNameFromVS);
      const filters = inputs[QuestionNames.ApiOperation] as string[];
      // download template
      const templateRes = await Generator.generateTemplate(
        context,
        destinationPath,
        templateName,
        language === ProgrammingLanguage.CSharp ? ProgrammingLanguage.CSharp : undefined
      );
      if (templateRes.isErr()) return err(templateRes.error);

      const url = inputs[QuestionNames.ApiSpecLocation] ?? inputs.openAIPluginManifest?.api.url;

      // validate API spec
      const specParser = new SpecParser(url);
      const validationRes = await specParser.validate();
      const specWarnings = validationRes.warnings;
      const operationIdWarning = specWarnings.find(
        (w) => w.type === WarningType.OperationIdMissing
      );
      if (operationIdWarning && operationIdWarning.data) {
        const apisMissingOperationId = (operationIdWarning.data as string[]).filter((api) =>
          filters.includes(api)
        );
        if (apisMissingOperationId.length > 0) {
          operationIdWarning.content = util.format(
            ConstantString.MissingOperationId,
            apisMissingOperationId.join(", ")
          );
        } else {
          specWarnings.splice(specWarnings.indexOf(operationIdWarning), 1);
        }
      }

      if (validationRes.status === ValidationStatus.Error) {
        logValidationResults(validationRes.errors, specWarnings, context, true, false, true);
        const errorMessage =
          inputs.platform === Platform.VSCode
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

      // generate files
      const manifestPath = path.join(destinationPath, AppPackageFolderName, manifestFileName);

      const apiSpecFolderPath = path.join(destinationPath, AppPackageFolderName, apiSpecFolderName);
      await fs.ensureDir(apiSpecFolderPath);

      let isYaml: boolean;
      try {
        isYaml = await isYamlSpecFile(url);
      } catch (e) {
        isYaml = false;
      }
      const openapiSpecPath = path.join(
        apiSpecFolderPath,
        isYaml ? apiSpecYamlFileName : apiSpecJsonFileName
      );

      const adaptiveCardFolder = path.join(
        destinationPath,
        AppPackageFolderName,
        AdaptiveFolderName
      );
      await specParser.generate(manifestPath, filters, openapiSpecPath, adaptiveCardFolder);

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

      // log warnings
      if (inputs.platform === Platform.CLI || inputs.platform === Platform.VS) {
        const warnSummary = generateScaffoldingSummary(
          specWarnings,
          teamsManifest,
          destinationPath
        );

        if (warnSummary) {
          void context.logProvider.info(warnSummary);
        }
      }

      if (inputs.platform === Platform.VSCode) {
        return ok({
          warnings: specWarnings.map((specWarning) => {
            return {
              type: specWarning.type,
              content: specWarning.content,
            };
          }),
        });
      } else {
        return ok({ warnings: undefined });
      }
    } catch (e) {
      let error: FxError;
      if (e instanceof SpecParserError) {
        error = convertSpecParserErrorToFxError(e);
      } else {
        error = assembleError(e);
      }
      return err(error);
    }
  }
}
