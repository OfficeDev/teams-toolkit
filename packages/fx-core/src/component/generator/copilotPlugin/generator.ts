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
  specParserGenerateResultAllSuccessTelemetryProperty,
  specParserGenerateResultTelemetryEvent,
  specParserGenerateResultWarningsTelemetryProperty,
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
import { isValidHttpUrl } from "../../../question/util";

const fromApiSpeccomponentName = "copilot-plugin-existing-api";
const fromApiSpecTemplateName = "copilot-plugin-existing-api";
const fromOpenAIPlugincomponentName = "copilot-plugin-from-oai-plugin";
const fromOpenAIPluginTemplateName = "copilot-plugin-from-oai-plugin";
const apiSpecFolderName = "apiSpecificationFiles";
const apiSpecYamlFileName = "openapi.yaml";
const apiSpecJsonFileName = "openapi.json";

const invalidApiSpecErrorName = "invalid-api-spec";
const copilotPluginExistingApiSpecUrlTelemetryEvent = "copilot-plugin-existing-api-spec-url";
const isRemoteUrlTelemetryProperty = "remote-url";

export interface CopilotPluginGeneratorResult {
  warnings?: Warning[];
}

export class CopilotPluginGenerator {
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: fromApiSpeccomponentName,
      telemetryEventName: TelemetryEvents.Generate,
      errorSource: fromApiSpeccomponentName,
    }),
  ])
  public static async generateFromApiSpec(
    context: Context,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<CopilotPluginGeneratorResult, FxError>> {
    return await this.generateForME(
      context,
      inputs,
      destinationPath,
      fromApiSpecTemplateName,
      fromApiSpeccomponentName
    );
  }

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: fromOpenAIPlugincomponentName,
      telemetryEventName: TelemetryEvents.Generate,
      errorSource: fromOpenAIPlugincomponentName,
    }),
  ])
  public static async generateFromOpenAIPlugin(
    context: Context,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<CopilotPluginGeneratorResult, FxError>> {
    return await this.generateForME(
      context,
      inputs,
      destinationPath,
      fromOpenAIPluginTemplateName,
      fromOpenAIPlugincomponentName
    );
  }

  private static async generateForME(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    templateName: string,
    componentName: string
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
      context.telemetryReporter.sendTelemetryEvent(copilotPluginExistingApiSpecUrlTelemetryEvent, {
        [isRemoteUrlTelemetryProperty]: isValidHttpUrl(url).toString(),
      });

      // validate API spec
      const specParser = new SpecParser(url);
      const validationRes = await specParser.validate();
      const warnings = validationRes.warnings;
      const operationIdWarning = warnings.find((w) => w.type === WarningType.OperationIdMissing);
      if (operationIdWarning && operationIdWarning.data) {
        const apisMissingOperationId = (operationIdWarning.data as string[]).filter((api) =>
          filters.includes(api)
        );
        if (apisMissingOperationId.length > 0) {
          operationIdWarning.content = util.format(
            ConstantString.MissingOperationId,
            apisMissingOperationId.join("; ")
          );
          delete operationIdWarning.data;
        } else {
          warnings.splice(warnings.indexOf(operationIdWarning), 1);
        }
      }

      if (validationRes.status === ValidationStatus.Error) {
        logValidationResults(validationRes.errors, warnings, context, true, false, true);
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
      const manifestPath = path.join(
        destinationPath,
        AppPackageFolderName,
        ManifestTemplateFileName
      );

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
      const generateResult = await specParser.generate(
        manifestPath,
        filters,
        openapiSpecPath,
        adaptiveCardFolder
      );

      context.telemetryReporter.sendTelemetryEvent(specParserGenerateResultTelemetryEvent, {
        [specParserGenerateResultAllSuccessTelemetryProperty]: generateResult.allSuccess.toString(),
        [specParserGenerateResultWarningsTelemetryProperty]: generateResult.warnings
          .map((w) => w.type.toString())
          .join("; "),
      });

      if (generateResult.warnings.length > 0) {
        generateResult.warnings.find((o) => {
          if (o.type === WarningType.OperationOnlyContainsOptionalParam) {
            o.content = ""; // We don't care content of this warning
          }
        });
        warnings.push(...generateResult.warnings);
      }

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
        const warnSummary = generateScaffoldingSummary(warnings, teamsManifest, destinationPath);

        if (warnSummary) {
          void context.logProvider.info(warnSummary);
        }
      }

      if (inputs.platform === Platform.VSCode) {
        return ok({
          warnings: warnings.map((warning) => {
            return {
              type: warning.type,
              content: warning.content,
              data: warning.data,
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
