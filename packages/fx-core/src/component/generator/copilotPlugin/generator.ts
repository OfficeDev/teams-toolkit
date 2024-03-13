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
  SystemError,
} from "@microsoft/teamsfx-api";
import { Generator } from "../generator";
import path from "path";
import { ActionContext, ActionExecutionMW } from "../../middleware/actionExecutionMW";
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
  invalidApiSpecErrorName,
  copilotPluginParserOptions,
  updateForCustomApi,
} from "./helper";
import { getLocalizedString } from "../../../common/localizeUtils";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";
import { CapabilityOptions, ProgrammingLanguage } from "../../../question/create";
import * as fs from "fs-extra";
import { assembleError } from "../../../error";
import {
  SpecParserError,
  SpecParser,
  ValidationStatus,
  WarningType,
  ProjectType,
} from "@microsoft/m365-spec-parser";
import * as util from "util";
import { isValidHttpUrl } from "../../../question/util";
import { isApiKeyEnabled, isMultipleParametersEnabled } from "../../../common/featureFlags";
import { merge } from "lodash";

const fromApiSpecComponentName = "copilot-plugin-existing-api";
const pluginFromApiSpecComponentName = "api-copilot-plugin-existing-api";
const fromApiSpecTemplateName = "copilot-plugin-existing-api";
const fromApiSpecWithApiKeyTemplateName = "copilot-plugin-existing-api-api-key";
const fromOpenAIPlugincomponentName = "copilot-plugin-from-oai-plugin";
const fromOpenAIPluginTemplateName = "copilot-plugin-from-oai-plugin";
const forCustomCopilotRagCustomApi = "custom-copilot-rag-custom-api";
const apiSpecFolderName = "apiSpecificationFile";
const apiSpecYamlFileName = "openapi.yaml";
const apiSpecJsonFileName = "openapi.json";
const pluginManifestFileName = "ai-plugin.json";

const copilotPluginExistingApiSpecUrlTelemetryEvent = "copilot-plugin-existing-api-spec-url";

const apiPluginFromApiSpecTemplateName = "api-plugin-existing-api";

const failedToUpdateCustomApiTemplateErrorName = "failed-to-update-custom-api-template";

const enum telemetryProperties {
  templateName = "template-name",
  generateType = "generate-type",
  isRemoteUrlTelemetryProperty = "remote-url",
}

function normalizePath(path: string): string {
  return "./" + path.replace(/\\/g, "/");
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
  public static async generateMeFromApiSpec(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<CopilotPluginGeneratorResult, FxError>> {
    const apiOperations = inputs[QuestionNames.ApiOperation] as string[];
    const authApi = (inputs.supportedApisFromApiSpec as ApiOperation[]).find(
      (api) => !!api.data.authName && apiOperations.includes(api.id)
    );

    const templateName = authApi ? fromApiSpecWithApiKeyTemplateName : fromApiSpecTemplateName;
    const componentName = fromApiSpecComponentName;

    merge(actionContext?.telemetryProps, { [telemetryProperties.templateName]: templateName });

    return await this.generate(
      context,
      inputs,
      destinationPath,
      templateName,
      componentName,
      false,
      authApi?.data
    );
  }

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: pluginFromApiSpecComponentName,
      telemetryEventName: TelemetryEvents.Generate,
      errorSource: pluginFromApiSpecComponentName,
    }),
  ])
  public static async generatePluginFromApiSpec(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<CopilotPluginGeneratorResult, FxError>> {
    const apiOperations = inputs[QuestionNames.ApiOperation] as string[];
    const authApi = (inputs.supportedApisFromApiSpec as ApiOperation[]).find(
      (api) => !!api.data.authName && apiOperations.includes(api.id)
    );

    const templateName = apiPluginFromApiSpecTemplateName;
    const componentName = fromApiSpecComponentName;

    merge(actionContext?.telemetryProps, { [telemetryProperties.templateName]: templateName });

    return await this.generate(
      context,
      inputs,
      destinationPath,
      templateName,
      componentName,
      true,
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
    return await this.generate(
      context,
      inputs,
      destinationPath,
      fromOpenAIPluginTemplateName,
      fromOpenAIPlugincomponentName,
      false
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
  public static async generateForCustomCopilotRagCustomApi(
    context: Context,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<CopilotPluginGeneratorResult, FxError>> {
    return await this.generate(
      context,
      inputs,
      destinationPath,
      forCustomCopilotRagCustomApi,
      forCustomCopilotRagCustomApi,
      false
    );
  }

  private static async generate(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    templateName: string,
    componentName: string,
    isPlugin: boolean,
    apiKeyAuthData?: ApiKeyAuthInfo
  ): Promise<Result<CopilotPluginGeneratorResult, FxError>> {
    try {
      const appName = inputs[QuestionNames.AppName];
      const language = inputs[QuestionNames.ProgrammingLanguage];
      const safeProjectNameFromVS =
        language === "csharp" ? inputs[QuestionNames.SafeProjectName] : undefined;
      const type =
        templateName === forCustomCopilotRagCustomApi
          ? ProjectType.TeamsAi
          : isPlugin
          ? ProjectType.Copilot
          : ProjectType.SME;

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
        context.templateVariables = Generator.getDefaultVariables(
          appName,
          safeProjectNameFromVS,
          inputs.targetFramework,
          inputs.placeProjectFileInSolutionDir === "true",
          {
            authName: apiKeyAuthData.authName,
            openapiSpecPath: normalizePath(
              path.join(AppPackageFolderName, apiSpecFolderName, openapiSpecFileName)
            ),
            registrationIdEnvName: `${apiKeyAuthData.authName.toUpperCase()}_REGISTRATION_ID`,
          }
        );
      } else {
        context.templateVariables = Generator.getDefaultVariables(
          appName,
          safeProjectNameFromVS,
          inputs.targetFramework,
          inputs.placeProjectFileInSolutionDir === "true"
        );
      }
      const filters = inputs[QuestionNames.ApiOperation] as string[];

      if (templateName != forCustomCopilotRagCustomApi) {
        // download template
        const templateRes = await Generator.generateTemplate(
          context,
          destinationPath,
          templateName,
          language === ProgrammingLanguage.CSharp ? ProgrammingLanguage.CSharp : undefined
        );
        if (templateRes.isErr()) return err(templateRes.error);
      }

      context.telemetryReporter.sendTelemetryEvent(copilotPluginExistingApiSpecUrlTelemetryEvent, {
        [telemetryProperties.isRemoteUrlTelemetryProperty]: isValidHttpUrl(url).toString(),
        [telemetryProperties.generateType]: type.toString(),
      });

      // validate API spec
      const allowAPIKeyAuth = isApiKeyEnabled();
      const allowMultipleParameters = isMultipleParametersEnabled();
      const specParser = new SpecParser(
        url,
        isPlugin
          ? copilotPluginParserOptions
          : {
              allowAPIKeyAuth,
              allowMultipleParameters,
              projectType: type,
            }
      );
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

      let generateResult;

      if (isPlugin) {
        const pluginManifestPath = path.join(
          destinationPath,
          AppPackageFolderName,
          pluginManifestFileName
        );
        generateResult = await specParser.generateForCopilot(
          manifestPath,
          filters,
          openapiSpecPath,
          pluginManifestPath
        );
      } else {
        const responseTemplateFolder = path.join(
          destinationPath,
          AppPackageFolderName,
          ResponseTemplatesFolderName
        );
        generateResult = await specParser.generate(
          manifestPath,
          filters,
          openapiSpecPath,
          type === ProjectType.TeamsAi ? undefined : responseTemplateFolder
        );
      }

      context.telemetryReporter.sendTelemetryEvent(specParserGenerateResultTelemetryEvent, {
        [telemetryProperties.generateType]: type.toString(),
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

      if (componentName === forCustomCopilotRagCustomApi) {
        const specs = await specParser.getFilteredSpecs(filters);
        const spec = specs[1];
        try {
          await updateForCustomApi(spec, language, destinationPath, openapiSpecFileName);
        } catch (error: any) {
          throw new SystemError(
            componentName,
            failedToUpdateCustomApiTemplateErrorName,
            error.message,
            error.message
          );
        }
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
