// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import { hooks } from "@feathersjs/hooks/lib";
import {
  ProjectType,
  SpecParser,
  SpecParserError,
  ValidationStatus,
  WarningType,
} from "@microsoft/m365-spec-parser";
import {
  AppPackageFolderName,
  AuthInfo,
  Context,
  FxError,
  GeneratorResult,
  Inputs,
  ManifestTemplateFileName,
  Platform,
  ResponseTemplatesFolderName,
  Result,
  SystemError,
  UserError,
  Warning,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { merge } from "lodash";
import path from "path";
import { FeatureFlags, featureFlagManager } from "../../common/featureFlags";
import { getLocalizedString } from "../../common/localizeUtils";
import { isValidHttpUrl } from "../../common/stringUtils";
import { assembleError } from "../../error";
import { ProgrammingLanguage, QuestionNames } from "../../question/constants";
import { manifestUtils } from "../driver/teamsApp/utils/ManifestUtils";
import { ActionContext, ActionExecutionMW } from "../middleware/actionExecutionMW";
import { Generator } from "./generator";
import { TelemetryEvents } from "./spfx/utils/telemetryEvents";
import {
  convertSpecParserErrorToFxError,
  copilotPluginParserOptions,
  defaultApiSpecFolderName,
  defaultApiSpecJsonFileName,
  defaultApiSpecYamlFileName,
  defaultPluginManifestFileName,
  generateScaffoldingSummary,
  getEnvName,
  invalidApiSpecErrorName,
  isYamlSpecFile,
  logValidationResults,
  specParserGenerateResultAllSuccessTelemetryProperty,
  specParserGenerateResultTelemetryEvent,
  specParserGenerateResultWarningsTelemetryProperty,
  updateForCustomApi,
  validateSpec,
} from "../driver/teamsApp/utils/SpecUtils";

const fromApiSpecComponentName = "copilot-plugin-existing-api";
const pluginFromApiSpecComponentName = "api-copilot-plugin-existing-api";
const fromApiSpecTemplateName = "copilot-plugin-existing-api";
const fromOpenAIPlugincomponentName = "copilot-plugin-from-oai-plugin";
const forCustomCopilotRagCustomApi = "custom-copilot-rag-custom-api";
const copilotPluginExistingApiSpecUrlTelemetryEvent = "copilot-plugin-existing-api-spec-url";

const apiPluginFromApiSpecTemplateName = "api-plugin-existing-api";

const failedToUpdateCustomApiTemplateErrorName = "failed-to-update-custom-api-template";

const enum telemetryProperties {
  templateName = "template-name",
  generateType = "generate-type",
  isRemoteUrlTelemetryProperty = "remote-url",
  authType = "auth-type",
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
    const templateName = fromApiSpecTemplateName;
    const componentName = fromApiSpecComponentName;

    merge(actionContext?.telemetryProps, { [telemetryProperties.templateName]: templateName });

    return await this.generate(
      context,
      inputs,
      destinationPath,
      templateName,
      componentName,
      false,
      inputs.apiAuthData
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
      inputs.apiAuthData
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
    authData?: AuthInfo
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
      let url = inputs[QuestionNames.ApiSpecLocation];
      url = url.trim();
      let isYaml: boolean;
      try {
        isYaml = await isYamlSpecFile(url);
      } catch (e) {
        isYaml = false;
      }
      const openapiSpecFileName = isYaml ? defaultApiSpecYamlFileName : defaultApiSpecJsonFileName;
      if (authData?.authName) {
        const envName = getEnvName(authData.authName, authData.authType);
        context.templateVariables = Generator.getDefaultVariables(
          appName,
          safeProjectNameFromVS,
          inputs.targetFramework,
          inputs.placeProjectFileInSolutionDir === "true",
          {
            authName: authData.authName,
            openapiSpecPath: normalizePath(
              path.join(AppPackageFolderName, defaultApiSpecFolderName, openapiSpecFileName)
            ),
            registrationIdEnvName: envName,
            authType: authData.authType,
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
        [telemetryProperties.authType]: authData?.authType ?? "None",
      });

      const getTemplateInfosState: any = {};
      inputs.getTemplateInfosState = getTemplateInfosState;
      getTemplateInfosState.isYaml = isYaml;
      getTemplateInfosState.isPlugin = isPlugin;
      getTemplateInfosState.templateName = templateName;
      getTemplateInfosState.url = url;
      getTemplateInfosState.type = type;
      const res = await this.post(context, inputs, destinationPath);
      return res;
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

  private static async post(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<GeneratorResult, FxError>> {
    try {
      const componentName = "copilot-generator";
      const getTemplateInfosState = inputs.getTemplateInfosState;
      // validate API spec
      const specParser = new SpecParser(
        getTemplateInfosState.url,
        getTemplateInfosState.isPlugin
          ? copilotPluginParserOptions
          : {
              allowBearerTokenAuth: true, // Currently, API key auth support is actually bearer token auth
              allowMultipleParameters: true,
              projectType: getTemplateInfosState.type,
              allowOauth2: featureFlagManager.getBooleanValue(FeatureFlags.SMEOAuth),
            }
      );
      const filters = inputs[QuestionNames.ApiOperation] as string[];
      const validationRes = await validateSpec(specParser, filters);
      const warnings = validationRes.warnings;
      if (validationRes.status === ValidationStatus.Error) {
        logValidationResults(validationRes.errors, warnings, context, false, true);
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
      const manifestPath = path.join(
        destinationPath,
        AppPackageFolderName,
        ManifestTemplateFileName
      );
      const apiSpecFolderPath = path.join(
        destinationPath,
        AppPackageFolderName,
        defaultApiSpecFolderName
      );
      const openapiSpecFileName = getTemplateInfosState.isYaml
        ? defaultApiSpecYamlFileName
        : defaultApiSpecJsonFileName;
      const openapiSpecPath = path.join(apiSpecFolderPath, openapiSpecFileName);
      // generate files
      await fs.ensureDir(apiSpecFolderPath);

      let generateResult;

      if (getTemplateInfosState.isPlugin) {
        const pluginManifestPath = path.join(
          destinationPath,
          AppPackageFolderName,
          defaultPluginManifestFileName
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
          getTemplateInfosState.type === ProjectType.TeamsAi ? undefined : responseTemplateFolder
        );
      }

      context.telemetryReporter.sendTelemetryEvent(specParserGenerateResultTelemetryEvent, {
        [telemetryProperties.generateType]: getTemplateInfosState.type.toString(),
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

      if (getTemplateInfosState.templateName === forCustomCopilotRagCustomApi) {
        const specs = await specParser.getFilteredSpecs(filters);
        const spec = specs[1];
        try {
          const language = inputs[QuestionNames.ProgrammingLanguage] as ProgrammingLanguage;
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
        const warnSummary = generateScaffoldingSummary(
          warnings,
          teamsManifest,
          path.relative(destinationPath, openapiSpecPath)
        );

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
