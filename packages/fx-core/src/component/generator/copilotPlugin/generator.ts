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
  ResponseTemplatesFolderName,
  AppPackageFolderName,
  Warning,
  ApiOperation,
  ApiKeyAuthInfo,
} from "@microsoft/teamsfx-api";
import { Generator } from "../generator";
import path from "path";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { TelemetryEvents } from "../spfx/utils/telemetryEvents";
import { QuestionNames } from "../../../question/questionNames";
import {
  convertSpecParserErrorToFxError,
  generateScaffoldingSummary,
  logValidationResults,
  OpenAIPluginManifestHelper,
  specParserGenerateResultAllSuccessTelemetryProperty,
  specParserGenerateResultTelemetryEvent,
  specParserGenerateResultWarningsTelemetryProperty,
  isYamlSpecFile,
} from "./helper";
import { getLocalizedString } from "../../../common/localizeUtils";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";
import { ProgrammingLanguage } from "../../../question/create";
import * as fs from "fs-extra";
import { assembleError } from "../../../error";
import {
  SpecParserError,
  SpecParser,
  ValidationStatus,
  WarningType,
} from "../../../common/spec-parser";
import * as util from "util";
import { isValidHttpUrl } from "../../../question/util";
import { isApiKeyEnabled } from "../../../common/featureFlags";
import { getRelativePath } from "../../../common/spec-parser/manifestUpdater";

const fromApiSpecComponentName = "copilot-plugin-existing-api";
const fromApiSpecTemplateName = "copilot-plugin-existing-api";
const fromApiSpecWithApiKeyComponentName = "copilot-plugin-existing-api-api-key";
const fromApiSpecWithApiKeyTemplateName = "copilot-plugin-existing-api-api-key";
const fromOpenAIPlugincomponentName = "copilot-plugin-from-oai-plugin";
const fromOpenAIPluginTemplateName = "copilot-plugin-from-oai-plugin";
const apiSpecFolderName = "apiSpecificationFiles";
const apiSpecYamlFileName = "openapi.yaml";
const apiSpecJsonFileName = "openapi.json";

const invalidApiSpecErrorName = "invalid-api-spec";
const copilotPluginExistingApiSpecUrlTelemetryEvent = "copilot-plugin-existing-api-spec-url";
const isRemoteUrlTelemetryProperty = "remote-url";

function normalizePath(path: string): string {
  return "./" + path.normalize(path).replace(/\\/g, "/");
}

export interface CopilotPluginGeneratorResult {
  warnings?: Warning[];
}

export class CopilotPluginGenerator {
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: fromApiSpecComponentName,
      telemetryEventName: TelemetryEvents.Generate,
      errorSource: fromApiSpecComponentName,
    }),
  ])
  public static async generateFromApiSpec(
    context: Context,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<CopilotPluginGeneratorResult, FxError>> {
    const authApi = (inputs[QuestionNames.ApiOperation] as ApiOperation[]).find(
      (api) => !!api.data.authName
    );
    return await this.generateForME(
      context,
      inputs,
      destinationPath,
      authApi ? fromApiSpecWithApiKeyTemplateName : fromApiSpecTemplateName,
      authApi ? fromApiSpecWithApiKeyComponentName : fromApiSpecComponentName,
      authApi?.data
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
    componentName: string,
    apiKeyAuthData?: ApiKeyAuthInfo
  ): Promise<Result<CopilotPluginGeneratorResult, FxError>> {
    try {
      const appName = inputs[QuestionNames.AppName];
      const language = inputs[QuestionNames.ProgrammingLanguage];
      const safeProjectNameFromVS =
        language === "csharp" ? inputs[QuestionNames.SafeProjectName] : undefined;

      const manifestPath = path.join(
        destinationPath,
        AppPackageFolderName,
        ManifestTemplateFileName
      );

      const apiSpecFolderPath = path.join(destinationPath, AppPackageFolderName, apiSpecFolderName);

      let url = inputs[QuestionNames.ApiSpecLocation] ?? inputs.openAIPluginManifest?.api.url;
      url = url.trim();

      let isYaml: boolean;
      try {
        isYaml = await isYamlSpecFile(url);
      } catch (e) {
        isYaml = false;
      }

      const openapiSpecFileName = isYaml ? apiSpecYamlFileName : apiSpecJsonFileName;
      const openapiSpecPath = path.join(apiSpecFolderPath, openapiSpecFileName);

      if (apiKeyAuthData?.authName) {
        context.templateVariables = Generator.getDefaultVariables(appName, safeProjectNameFromVS, {
          authName: apiKeyAuthData?.authName,
          domains: JSON.stringify([apiKeyAuthData.serverUrl]),
          openapiSpecPath: normalizePath(path.join(apiSpecFolderName, openapiSpecFileName)),
        });
      } else {
        context.templateVariables = Generator.getDefaultVariables(appName, safeProjectNameFromVS);
      }
      const apiOperations = inputs[QuestionNames.ApiOperation] as ApiOperation[];
      const filters = apiOperations.map((api) => api.id);
      // download template
      const templateRes = await Generator.generateTemplate(
        context,
        destinationPath,
        templateName,
        language === ProgrammingLanguage.CSharp ? ProgrammingLanguage.CSharp : undefined
      );
      if (templateRes.isErr()) return err(templateRes.error);

      context.telemetryReporter.sendTelemetryEvent(copilotPluginExistingApiSpecUrlTelemetryEvent, {
        [isRemoteUrlTelemetryProperty]: isValidHttpUrl(url).toString(),
      });

      // validate API spec
      const allowAPIKeyAuth = isApiKeyEnabled();
      const specParser = new SpecParser(url, { allowAPIKeyAuth });
      const validationRes = await specParser.validate();
      const warnings = validationRes.warnings;
      const operationIdWarning = warnings.find((w) => w.type === WarningType.OperationIdMissing);
      if (operationIdWarning && operationIdWarning.data) {
        const apisMissingOperationId = (operationIdWarning.data as string[]).filter((api) =>
          filters.includes(api)
        );
        if (apisMissingOperationId.length > 0) {
          operationIdWarning.content = util.format(
            getLocalizedString("core.common.MissingOperationId"),
            apisMissingOperationId.join(", ")
          );
          delete operationIdWarning.data;
        } else {
          warnings.splice(warnings.indexOf(operationIdWarning), 1);
        }
      }

      const specVersionWarning = warnings.find(
        (w) => w.type === WarningType.ConvertSwaggerToOpenAPI
      );
      if (specVersionWarning) {
        specVersionWarning.content = ""; // We don't care content of this warning
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
      await fs.ensureDir(apiSpecFolderPath);

      const adaptiveCardFolder = path.join(
        destinationPath,
        AppPackageFolderName,
        ResponseTemplatesFolderName
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
          .map((w) => w.type.toString() + ": " + w.content)
          .join(";"),
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
