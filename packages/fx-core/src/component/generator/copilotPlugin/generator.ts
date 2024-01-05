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
import { isApiKeyEnabled, isMultipleParametersEnabled } from "../../../common/featureFlags";
import { convertToLangKey } from "../utils";

const fromApiSpecComponentName = "copilot-plugin-existing-api";
const fromApiSpecTemplateName = "copilot-plugin-existing-api";
const fromApiSpecWithApiKeyComponentName = "copilot-plugin-existing-api-api-key";
const fromApiSpecWithApiKeyTemplateName = "copilot-plugin-existing-api-api-key";
const fromOpenAIPlugincomponentName = "copilot-plugin-from-oai-plugin";
const fromOpenAIPluginTemplateName = "copilot-plugin-from-oai-plugin";
const fromApiSpecToTeamsAI = "teams-ai-bot";
const apiSpecFolderName = "apiSpecificationFile";
const apiSpecYamlFileName = "openapi.yaml";
const apiSpecJsonFileName = "openapi.json";

const invalidApiSpecErrorName = "invalid-api-spec";
const copilotPluginExistingApiSpecUrlTelemetryEvent = "copilot-plugin-existing-api-spec-url";
const isRemoteUrlTelemetryProperty = "remote-url";

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
  public static async generateFromApiSpec(
    context: Context,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<CopilotPluginGeneratorResult, FxError>> {
    const apiOperations = inputs[QuestionNames.ApiOperation] as string[];
    const authApi = (inputs.supportedApisFromApiSpec as ApiOperation[]).find(
      (api) => !!api.data.authName && apiOperations.includes(api.id)
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

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: fromOpenAIPlugincomponentName,
      telemetryEventName: TelemetryEvents.Generate,
      errorSource: fromOpenAIPlugincomponentName,
    }),
  ])
  public static async generateForTeamsAI(
    context: Context,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<CopilotPluginGeneratorResult, FxError>> {
    return await this.generateForME(
      context,
      inputs,
      destinationPath,
      fromApiSpecToTeamsAI,
      fromApiSpecToTeamsAI,
      undefined,
      inputs[QuestionNames.ProgrammingLanguage] ?? undefined
    );
  }

  private static async generateForME(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    templateName: string,
    componentName: string,
    apiKeyAuthData?: ApiKeyAuthInfo,
    defaultLanguage?: ProgrammingLanguage
  ): Promise<Result<CopilotPluginGeneratorResult, FxError>> {
    try {
      const appName = inputs[QuestionNames.AppName];
      const language = defaultLanguage ?? inputs[QuestionNames.ProgrammingLanguage];
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
        context.templateVariables = Generator.getDefaultVariables(
          appName,
          safeProjectNameFromVS,
          inputs.targetFramework,
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
          inputs.targetFramework
        );
      }
      const filters = inputs[QuestionNames.ApiOperation] as string[];

      // download template
      const templateRes = await Generator.generateTemplate(
        context,
        destinationPath,
        templateName,
        language === ProgrammingLanguage.CSharp
          ? ProgrammingLanguage.CSharp
          : defaultLanguage
          ? convertToLangKey(defaultLanguage)
          : undefined
      );
      if (templateRes.isErr()) return err(templateRes.error);

      context.telemetryReporter.sendTelemetryEvent(copilotPluginExistingApiSpecUrlTelemetryEvent, {
        [isRemoteUrlTelemetryProperty]: isValidHttpUrl(url).toString(),
      });

      // validate API spec
      const allowAPIKeyAuth = isApiKeyEnabled();
      const allowMultipleParameters = isMultipleParametersEnabled();
      const specParser = new SpecParser(url, { allowAPIKeyAuth, allowMultipleParameters });
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

      // update teams ai bot
      if (componentName == fromApiSpecToTeamsAI) {
        const content = await specParser.updateTeamsAiApp(filters, openapiSpecPath);
        if (!content || content.length != 5) {
          return err(
            new UserError(
              componentName,
              "update-teams-ai-bot",
              "Failed to update teams ai bot",
              "Failed to update teams ai bot"
            )
          );
        }

        // generate files
        const sequenceFolderPath = path.join(destinationPath, "src", "prompts", "sequence");
        await fs.ensureDir(sequenceFolderPath);

        const actions = content[0];
        const actionsFilePath = path.join(sequenceFolderPath, "actions.json");
        await fs.writeFile(actionsFilePath, JSON.stringify(actions, null, 2));

        const config = content[1];
        const configFilePath = path.join(sequenceFolderPath, "config.json");
        await fs.writeFile(configFilePath, JSON.stringify(config, null, 2));

        const prompt = content[2];
        const promptFilePath = path.join(sequenceFolderPath, "skprompt.txt");
        await fs.writeFile(promptFilePath, prompt);

        const code = content[3].map((value) => value.code).join("\n");
        const indexFilePath = path.join(destinationPath, "src", "index.ts");
        const indexFileContent = (await fs.readFile(indexFilePath)).toString();
        const updateIndexFile = indexFileContent
          .replace("// TODO: add function to add ai action.", code)
          .replace("{{OPENAPI_SPEC_PATH}}", openapiSpecFileName);
        await fs.writeFile(indexFilePath, updateIndexFile);

        const manifestContent = await fs.readFile(manifestPath);
        const manifest = JSON.parse(manifestContent.toString());
        delete manifest.composeExtensions;
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
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
