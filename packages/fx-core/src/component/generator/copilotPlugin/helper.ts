// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import {
  Context,
  FxError,
  OpenAIManifestAuthType,
  OpenAIPluginManifest,
  Result,
  UserError,
  err,
  ok,
  TeamsAppManifest,
  ApiOperation,
  ManifestTemplateFileName,
  Warning,
  AppPackageFolderName,
  ManifestUtil,
  IMessagingExtensionCommand,
  SystemError,
  Inputs,
} from "@microsoft/teamsfx-api";
import axios, { AxiosResponse } from "axios";
import { sendRequestWithRetry } from "../utils";
import {
  SpecParser,
  ErrorType as ApiSpecErrorType,
  ValidationStatus,
  WarningResult,
  WarningType,
  SpecParserError,
  ErrorType,
  ErrorResult as ApiSpecErrorResult,
  ListAPIResult,
  ProjectType,
  ParseOptions,
  AdaptiveCardGenerator,
  Utils,
  InvalidAPIInfo,
} from "@microsoft/m365-spec-parser";
import fs from "fs-extra";
import { getLocalizedString } from "../../../common/localizeUtils";
import { MissingRequiredInputError } from "../../../error";
import { EOL } from "os";
import { SummaryConstant } from "../../configManager/constant";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";
import path from "path";
import { QuestionNames } from "../../../question/questionNames";
import { pluginManifestUtils } from "../../driver/teamsApp/utils/PluginManifestUtils";
import { copilotPluginApiSpecOptionId } from "../../../question/constants";
import { OpenAPIV3 } from "openapi-types";
import { CustomCopilotRagOptions, ProgrammingLanguage } from "../../../question";
import { ListAPIInfo } from "@microsoft/m365-spec-parser/dist/src/interfaces";
import { isCopilotAuthEnabled } from "../../../common/featureFlags";

const manifestFilePath = "/.well-known/ai-plugin.json";
const componentName = "OpenAIPluginManifestHelper";

const enum telemetryProperties {
  validationStatus = "validation-status",
  validationErrors = "validation-errors",
  validationWarnings = "validation-warnings",
  validApisCount = "valid-apis-count",
  allApisCount = "all-apis-count",
  isFromAddingApi = "is-from-adding-api",
}

const enum telemetryEvents {
  validateApiSpec = "validate-api-spec",
  validateOpenAiPluginManifest = "validate-openai-plugin-manifest",
  listApis = "spec-parser-list-apis-result",
}

enum OpenAIPluginManifestErrorType {
  AuthNotSupported = "openai-pliugin-auth-not-supported",
  ApiUrlMissing = "openai-plugin-api-url-missing",
}

export const copilotPluginParserOptions: ParseOptions = {
  allowAPIKeyAuth: false,
  allowBearerTokenAuth: isCopilotAuthEnabled(),
  allowMultipleParameters: true,
  allowOauth2: isCopilotAuthEnabled(),
  projectType: ProjectType.Copilot,
  allowMissingId: true,
  allowSwagger: true,
  allowMethods: ["get", "post", "put", "delete", "patch", "head", "connect", "options", "trace"],
  allowResponseSemantics: true,
  allowConversationStarters: true,
  allowConfirmation: true,
};

export const specParserGenerateResultTelemetryEvent = "spec-parser-generate-result";
export const specParserGenerateResultAllSuccessTelemetryProperty = "all-success";
export const specParserGenerateResultWarningsTelemetryProperty = "warnings";

export const invalidApiSpecErrorName = "invalid-api-spec";
const apiSpecNotUsedInPlugin = "api-spec-not-used-in-plugin";

export const defaultApiSpecFolderName = "apiSpecificationFile";
export const defaultApiSpecYamlFileName = "openapi.yaml";
export const defaultApiSpecJsonFileName = "openapi.json";
export const defaultPluginManifestFileName = "ai-plugin.json";

export interface ErrorResult {
  /**
   * The type of error.
   */
  type: ApiSpecErrorType | OpenAIPluginManifestErrorType;

  /**
   * The content of the error.
   */
  content: string;

  data?: any;
}

export class OpenAIPluginManifestHelper {
  static async loadOpenAIPluginManifest(input: string): Promise<OpenAIPluginManifest> {
    input = input.trim();
    let path = input.endsWith("/") ? input.substring(0, input.length - 1) : input;
    if (!input.toLowerCase().endsWith(manifestFilePath)) {
      path = path + manifestFilePath;
    }
    if (!input.toLowerCase().startsWith("https://") && !input.toLowerCase().startsWith("http://")) {
      path = "https://" + path;
    }

    try {
      const res: AxiosResponse<any> = await sendRequestWithRetry(async () => {
        return await axios.get(path);
      }, 3);

      return res.data;
    } catch (e) {
      throw new UserError(
        componentName,
        "loadOpenAIPluginManifest",
        getLocalizedString("error.copilotPlugin.openAiPluginManifest.CannotGetManifest", path),
        getLocalizedString("error.copilotPlugin.openAiPluginManifest.CannotGetManifest", path)
      );
    }
  }

  static async updateManifest(
    openAiPluginManifest: OpenAIPluginManifest,
    teamsAppManifest: TeamsAppManifest,
    manifestPath: string
  ): Promise<Result<undefined, FxError>> {
    teamsAppManifest.description.full = openAiPluginManifest.description_for_human;
    teamsAppManifest.description.short = openAiPluginManifest.description_for_human;
    teamsAppManifest.developer.websiteUrl = openAiPluginManifest.legal_info_url;
    teamsAppManifest.developer.privacyUrl = openAiPluginManifest.legal_info_url;
    teamsAppManifest.developer.termsOfUseUrl = openAiPluginManifest.legal_info_url;

    await fs.writeFile(manifestPath, JSON.stringify(teamsAppManifest, null, "\t"), "utf-8");
    return ok(undefined);
  }
}

export async function listOperations(
  context: Context,
  manifest: OpenAIPluginManifest | undefined,
  apiSpecUrl: string | undefined,
  inputs: Inputs,
  includeExistingAPIs = true,
  shouldLogWarning = true,
  existingCorrelationId?: string
): Promise<Result<ApiOperation[], ErrorResult[]>> {
  if (manifest) {
    const errors = validateOpenAIPluginManifest(manifest);
    logValidationResults(
      errors,
      [],
      context,
      false,
      shouldLogWarning,
      false,
      existingCorrelationId
    );
    if (errors.length > 0) {
      return err(errors);
    }
    apiSpecUrl = manifest.api.url;
  }

  const isPlugin = inputs[QuestionNames.Capabilities] === copilotPluginApiSpecOptionId;
  const isCustomApi =
    inputs[QuestionNames.CustomCopilotRag] === CustomCopilotRagOptions.customApi().id;

  try {
    const specParser = new SpecParser(
      apiSpecUrl as string,
      isPlugin
        ? copilotPluginParserOptions
        : isCustomApi
        ? {
            projectType: ProjectType.TeamsAi,
          }
        : {
            allowBearerTokenAuth: true, // Currently, API key auth support is actually bearer token auth
            allowMultipleParameters: true,
            allowOauth2: isCopilotAuthEnabled(),
          }
    );
    const validationRes = await specParser.validate();
    validationRes.errors = formatValidationErrors(validationRes.errors, inputs);

    logValidationResults(
      validationRes.errors,
      validationRes.warnings,
      context,
      true,
      shouldLogWarning,
      false,
      existingCorrelationId
    );
    if (validationRes.status === ValidationStatus.Error) {
      return err(validationRes.errors);
    }

    const listResult: ListAPIResult = await specParser.list();
    let operations = listResult.APIs.filter((value) => value.isValid);
    context.telemetryReporter.sendTelemetryEvent(telemetryEvents.listApis, {
      [telemetryProperties.validApisCount]: listResult.validAPICount.toString(),
      [telemetryProperties.allApisCount]: listResult.allAPICount.toString(),
      [telemetryProperties.isFromAddingApi]: (!includeExistingAPIs).toString(),
    });

    // Filter out exsiting APIs
    if (!includeExistingAPIs) {
      const teamsManifestPath = inputs[QuestionNames.ManifestPath];
      if (!teamsManifestPath) {
        throw new MissingRequiredInputError("teamsManifestPath", "inputs");
      }
      const manifest = await manifestUtils._readAppManifest(teamsManifestPath);
      let existingOperations: string[] = [];
      if (manifest.isOk()) {
        if (isPlugin) {
          existingOperations = await listPluginExistingOperations(
            manifest.value,
            teamsManifestPath,
            inputs[QuestionNames.DestinationApiSpecFilePath]
          );
        } else {
          const existingOperationIds = manifestUtils.getOperationIds(manifest.value);
          existingOperations = operations
            .filter((operation) => existingOperationIds.includes(operation.operationId))
            .map((operation) => operation.api);
        }

        operations = operations.filter(
          (operation: ListAPIInfo) => !existingOperations.includes(operation.api)
        );
        // No extra API can be added
        if (operations.length == 0) {
          const errors = formatValidationErrors(
            [
              {
                type: ApiSpecErrorType.NoExtraAPICanBeAdded,
                content: "",
              },
            ],
            inputs
          );
          logValidationResults(errors, [], context, true, false, false, existingCorrelationId);
          return err(errors);
        }
      } else {
        throw manifest.error;
      }
    }

    const sortedOperations = sortOperations(operations);
    return ok(sortedOperations);
  } catch (e) {
    if (e instanceof SpecParserError) {
      throw convertSpecParserErrorToFxError(e);
    } else {
      throw e;
    }
  }
}

function sortOperations(operations: ListAPIInfo[]): ApiOperation[] {
  const operationsWithSeparator: ApiOperation[] = [];
  for (const operation of operations) {
    const arr = operation.api.toUpperCase().split(" ");
    const result: ApiOperation = {
      id: operation.api,
      label: operation.api,
      groupName: arr[0],
      detail: !operation.auth
        ? getLocalizedString("core.copilotPlugin.api.noAuth")
        : Utils.isBearerTokenAuth(operation.auth.authScheme)
        ? getLocalizedString("core.copilotPlugin.api.apiKeyAuth")
        : Utils.isOAuthWithAuthCodeFlow(operation.auth.authScheme)
        ? getLocalizedString("core.copilotPlugin.api.oauth")
        : "",
      data: {
        serverUrl: operation.server,
      },
    };

    if (operation.auth) {
      if (Utils.isBearerTokenAuth(operation.auth.authScheme)) {
        result.data.authType = "apiKey";
        result.data.authName = operation.auth.name;
      } else if (Utils.isOAuthWithAuthCodeFlow(operation.auth.authScheme)) {
        result.data.authType = "oauth2";
        result.data.authName = operation.auth.name;
      }
    }

    operationsWithSeparator.push(result);
  }

  return operationsWithSeparator.sort((operation1: ApiOperation, operation2: ApiOperation) => {
    const arr1 = operation1.id.toLowerCase().split(" ");
    const arr2 = operation2.id.toLowerCase().split(" ");
    return arr1[0] < arr2[0] ? -1 : arr1[0] > arr2[0] ? 1 : arr1[1].localeCompare(arr2[1]);
  });
}

function formatTelemetryValidationProperty(result: ErrorResult | WarningResult): string {
  return result.type.toString();
}

export async function listPluginExistingOperations(
  manifest: TeamsAppManifest,
  teamsManifestPath: string,
  destinationApiSpecFilePath: string
): Promise<string[]> {
  const getApiSPecFileRes = await pluginManifestUtils.getApiSpecFilePathFromTeamsManifest(
    manifest,
    teamsManifestPath
  );
  if (getApiSPecFileRes.isErr()) {
    throw getApiSPecFileRes.error;
  }

  let apiSpecFilePath;
  const apiSpecFiles = getApiSPecFileRes.value;
  for (const file of apiSpecFiles) {
    if (path.resolve(file) === path.resolve(destinationApiSpecFilePath)) {
      apiSpecFilePath = file;
      break;
    }
  }
  if (!apiSpecFilePath) {
    throw new UserError(
      "listPluginExistingOperations",
      apiSpecNotUsedInPlugin,
      getLocalizedString("error.copilotPlugin.apiSpecNotUsedInPlugin", destinationApiSpecFilePath),
      getLocalizedString("error.copilotPlugin.apiSpecNotUsedInPlugin", destinationApiSpecFilePath)
    );
  }

  const specParser = new SpecParser(apiSpecFilePath, copilotPluginParserOptions);
  const listResult = await specParser.list();
  return listResult.APIs.map((o) => o.api);
}

export function logValidationResults(
  errors: ErrorResult[],
  warnings: WarningResult[],
  context: Context,
  isApiSpec: boolean,
  shouldLogWarning: boolean,
  shouldSkipTelemetry: boolean,
  existingCorrelationId?: string
): void {
  if (!shouldSkipTelemetry) {
    const properties: { [key: string]: string } = {
      [telemetryProperties.validationStatus]:
        errors.length !== 0 ? "error" : warnings.length !== 0 ? "warning" : "success",
      [telemetryProperties.validationErrors]: errors
        .map((error: ErrorResult) => formatTelemetryValidationProperty(error))
        .join(";"),
      [telemetryProperties.validationWarnings]: warnings
        .map((warn: WarningResult) => formatTelemetryValidationProperty(warn))
        .join(";"),
    };
    if (existingCorrelationId) {
      properties["correlation-id"] = existingCorrelationId;
    }
    context.telemetryReporter.sendTelemetryEvent(
      isApiSpec ? telemetryEvents.validateApiSpec : telemetryEvents.validateOpenAiPluginManifest,
      properties
    );
  }

  if (errors.length === 0 && (warnings.length === 0 || !shouldLogWarning)) {
    return;
  }

  // errors > 0 || (warnings > 0 && shouldLogWarning)
  const errorMessage = errors
    .map((error) => {
      return `${SummaryConstant.Failed} ${error.content}`;
    })
    .join(EOL);
  const warningMessage = shouldLogWarning
    ? warnings
        .map((warning) => {
          return `${SummaryConstant.NotExecuted} ${warning.content}`;
        })
        .join(EOL)
    : "";

  const failed = errors.length;
  const warns = warnings.length;
  const summaryStr = [];

  if (failed > 0) {
    summaryStr.push(
      getLocalizedString("core.copilotPlugin.validate.summary.validate.failed", failed)
    );
  }
  if (warns > 0 && shouldLogWarning) {
    summaryStr.push(
      getLocalizedString("core.copilotPlugin.validate.summary.validate.warning", warns)
    );
  }

  const outputMessage = isApiSpec
    ? EOL +
      getLocalizedString(
        "core.copilotPlugin.validate.apiSpec.summary",
        summaryStr.join(", "),
        errorMessage,
        warningMessage
      )
    : EOL +
      getLocalizedString(
        "core.copilotPlugin.validate.openAIPluginManifest.summary",
        summaryStr.join(", "),
        errorMessage,
        warningMessage
      );

  void context.logProvider.info(outputMessage);
}

function validateOpenAIPluginManifest(manifest: OpenAIPluginManifest): ErrorResult[] {
  const errors: ErrorResult[] = [];
  if (!manifest.api?.url) {
    errors.push({
      type: OpenAIPluginManifestErrorType.ApiUrlMissing,
      content: getLocalizedString(
        "core.createProjectQuestion.openAiPluginManifest.validationError.missingApiUrl",
        "api.url"
      ),
    });
  }

  if (manifest.auth?.type !== OpenAIManifestAuthType.None) {
    errors.push({
      type: OpenAIPluginManifestErrorType.AuthNotSupported,
      content: getLocalizedString(
        "core.createProjectQuestion.openAiPluginManifest.validationError.authNotSupported",
        "none"
      ),
    });
  }
  return errors;
}

export function generateScaffoldingSummary(
  warnings: Warning[],
  teamsManifest: TeamsAppManifest,
  apiSpecFilePath: string
): string {
  const apiSpecWarningMessage = formatApiSpecValidationWarningMessage(
    warnings,
    apiSpecFilePath,
    teamsManifest
  );
  const manifestWarningResult = validateTeamsManifestLength(teamsManifest, warnings);
  const manifestWarningMessage = manifestWarningResult.map((warn) => {
    return `${SummaryConstant.NotExecuted} ${warn}`;
  });

  if (apiSpecWarningMessage.length || manifestWarningMessage.length) {
    let details = "";
    if (apiSpecWarningMessage.length) {
      details += EOL + apiSpecWarningMessage.join(EOL);
    }

    if (manifestWarningMessage.length) {
      details += EOL + manifestWarningMessage.join(EOL);
    }

    return getLocalizedString("core.copilotPlugin.scaffold.summary", details);
  } else {
    return "";
  }
}

function formatApiSpecValidationWarningMessage(
  specWarnings: Warning[],
  apiSpecFileName: string,
  teamsManifest: TeamsAppManifest
): string[] {
  const resultWarnings = [];
  const operationIdWarning = specWarnings.find((w) => w.type === WarningType.OperationIdMissing);

  if (operationIdWarning) {
    const isApiMe = ManifestUtil.parseCommonProperties(teamsManifest).isApiME;
    resultWarnings.push(
      getLocalizedString(
        "core.copilotPlugin.scaffold.summary.warning.operationId",
        `${SummaryConstant.NotExecuted} ${operationIdWarning.content}`,
        isApiMe ? ManifestTemplateFileName : apiSpecFileName
      )
    );
  }

  const swaggerWarning = specWarnings.find((w) => w.type === WarningType.ConvertSwaggerToOpenAPI);

  if (swaggerWarning) {
    resultWarnings.push(
      `${SummaryConstant.NotExecuted} ` +
        getLocalizedString(
          "core.copilotPlugin.scaffold.summary.warning.swaggerVersion",
          apiSpecFileName
        )
    );
  }

  return resultWarnings;
}

function validateTeamsManifestLength(
  teamsManifest: TeamsAppManifest,
  warnings: Warning[]
): string[] {
  const nameShortLimit = 30;
  const nameFullLimit = 100;
  const descriptionShortLimit = 80;
  const descriptionFullLimit = 4000;
  const appnameSuffixPlaceholder = "${{APP_NAME_SUFFIX}}";
  const devEnv = "dev";
  const resultWarnings = [];

  // validate name
  const shortNameLength = teamsManifest.name.short.includes(appnameSuffixPlaceholder)
    ? teamsManifest.name.short.length - appnameSuffixPlaceholder.length + devEnv.length
    : teamsManifest.name.short.length;
  if (shortNameLength > nameShortLimit) {
    resultWarnings.push(formatLengthExceedingErrorMessage("/name/short", nameShortLimit));
  }

  if (!!teamsManifest.name.full && teamsManifest.name.full?.length > nameFullLimit) {
    resultWarnings.push(formatLengthExceedingErrorMessage("/name/full", nameFullLimit));
  }

  // validate description
  if (teamsManifest.description.short.length > descriptionShortLimit) {
    resultWarnings.push(
      formatLengthExceedingErrorMessage("/description/short", descriptionShortLimit)
    );
  }
  if (!teamsManifest.description.full?.length) {
    resultWarnings.push(
      getLocalizedString(
        "core.copilotPlugin.scaffold.summary.warning.teamsManifest.missingFullDescription"
      ) +
        getLocalizedString(
          "core.copilotPlugin.scaffold.summary.warning.teamsManifest.mitigation",
          "full/description",
          path.join(AppPackageFolderName, ManifestTemplateFileName)
        )
    );
  }
  if (teamsManifest.description.full!.length > descriptionFullLimit) {
    resultWarnings.push(
      formatLengthExceedingErrorMessage("/description/full", descriptionFullLimit)
    );
  }

  // validate command
  if (ManifestUtil.parseCommonProperties(teamsManifest).isApiME) {
    const optionalParamsOnlyWarnings = warnings.filter(
      (o) => o.type === WarningType.OperationOnlyContainsOptionalParam
    );

    const commands = teamsManifest.composeExtensions![0].commands;
    if (optionalParamsOnlyWarnings) {
      for (const optionalParamsOnlyWarning of optionalParamsOnlyWarnings) {
        const command = commands.find(
          (o: IMessagingExtensionCommand) => o.id === optionalParamsOnlyWarning.data
        );

        if (command && command.parameters) {
          const parameterName = command.parameters[0]?.name;
          resultWarnings.push(
            getLocalizedString(
              "core.copilotPlugin.scaffold.summary.warning.api.optionalParametersOnly",
              optionalParamsOnlyWarning.data,
              optionalParamsOnlyWarning.data
            ) +
              getLocalizedString(
                "core.copilotPlugin.scaffold.summary.warning.api.optionalParametersOnly.mitigation",
                parameterName,
                optionalParamsOnlyWarning.data,
                path.join(AppPackageFolderName, ManifestTemplateFileName),
                path.join(
                  AppPackageFolderName,
                  teamsManifest.composeExtensions![0].apiSpecificationFile ?? ""
                )
              )
          );
        }
      }
    }

    for (const command of commands) {
      if (command.type === "query") {
        if (!command.apiResponseRenderingTemplateFile) {
          const errorDetail = warnings.find(
            (w) => w.type === WarningType.GenerateCardFailed && w.data === command.id
          )?.content;
          resultWarnings.push(
            getLocalizedString(
              "core.copilotPlugin.scaffold.summary.warning.teamsManifest.missingCardTemlate",
              "apiResponseRenderingTemplateFile",
              command.id
            ) +
              getLocalizedString(
                "core.copilotPlugin.scaffold.summary.warning.teamsManifest.missingCardTemlate.mitigation",
                AppPackageFolderName,
                `composeExtensions/commands/${command.id}/apiResponseRenderingTemplateFile`,
                path.join(AppPackageFolderName, ManifestTemplateFileName)
              ) +
              (errorDetail ? EOL + errorDetail : "")
          );
        }
      }
    }
  }

  return resultWarnings;
}

function formatLengthExceedingErrorMessage(field: string, limit: number): string {
  return (
    getLocalizedString(
      "core.copilotPlugin.scaffold.summary.warning.teamsManifest.lengthExceeding",
      field,
      limit.toString()
    ) +
    getLocalizedString(
      "core.copilotPlugin.scaffold.summary.warning.teamsManifest.mitigation",
      field,
      path.join(AppPackageFolderName, ManifestTemplateFileName)
    )
  );
}

export function convertSpecParserErrorToFxError(error: SpecParserError): FxError {
  return new SystemError("SpecParser", error.errorType.toString(), error.message, error.message);
}

export async function isYamlSpecFile(specPath: string): Promise<boolean> {
  if (specPath.endsWith(".yaml") || specPath.endsWith(".yml")) {
    return true;
  } else if (specPath.endsWith(".json")) {
    return false;
  }
  const isRemoteFile = specPath.startsWith("http:") || specPath.startsWith("https:");
  const fileContent = isRemoteFile
    ? (await axios.get(specPath)).data
    : await fs.readFile(specPath, "utf-8");

  try {
    JSON.parse(fileContent);
    return false;
  } catch (error) {
    return true;
  }
}

export function formatValidationErrors(
  errors: ApiSpecErrorResult[],
  inputs: Inputs
): ApiSpecErrorResult[] {
  return errors.map((error) => {
    return {
      type: error.type,
      content: formatValidationErrorContent(error, inputs),
      data: error.data,
    };
  });
}

function mapInvalidReasonToMessage(reason: ErrorType): string {
  switch (reason) {
    case ErrorType.AuthTypeIsNotSupported:
      return getLocalizedString("core.common.invalidReason.AuthTypeIsNotSupported");
    case ErrorType.MissingOperationId:
      return getLocalizedString("core.common.invalidReason.MissingOperationId");
    case ErrorType.PostBodyContainMultipleMediaTypes:
      return getLocalizedString("core.common.invalidReason.PostBodyContainMultipleMediaTypes");
    case ErrorType.ResponseContainMultipleMediaTypes:
      return getLocalizedString("core.common.invalidReason.ResponseContainMultipleMediaTypes");
    case ErrorType.ResponseJsonIsEmpty:
      return getLocalizedString("core.common.invalidReason.ResponseJsonIsEmpty");
    case ErrorType.PostBodySchemaIsNotJson:
      return getLocalizedString("core.common.invalidReason.PostBodySchemaIsNotJson");
    case ErrorType.PostBodyContainsRequiredUnsupportedSchema:
      return getLocalizedString(
        "core.common.invalidReason.PostBodyContainsRequiredUnsupportedSchema"
      );
    case ErrorType.ParamsContainRequiredUnsupportedSchema:
      return getLocalizedString("core.common.invalidReason.ParamsContainRequiredUnsupportedSchema");
    case ErrorType.ParamsContainsNestedObject:
      return getLocalizedString("core.common.invalidReason.ParamsContainsNestedObject");
    case ErrorType.RequestBodyContainsNestedObject:
      return getLocalizedString("core.common.invalidReason.RequestBodyContainsNestedObject");
    case ErrorType.ExceededRequiredParamsLimit:
      return getLocalizedString("core.common.invalidReason.ExceededRequiredParamsLimit");
    case ErrorType.NoParameter:
      return getLocalizedString("core.common.invalidReason.NoParameter");
    case ErrorType.NoAPIInfo:
      return getLocalizedString("core.common.invalidReason.NoAPIInfo");
    case ErrorType.MethodNotAllowed:
      return getLocalizedString("core.common.invalidReason.MethodNotAllowed");
    case ErrorType.UrlPathNotExist:
      return getLocalizedString("core.common.invalidReason.UrlPathNotExist");
    case ErrorType.CircularReferenceNotSupported:
      return getLocalizedString("core.common.invalidReason.CircularReference");
    default:
      return reason.toString();
  }
}

function formatValidationErrorContent(error: ApiSpecErrorResult, inputs: Inputs): string {
  const isPlugin = inputs[QuestionNames.Capabilities] === copilotPluginApiSpecOptionId;
  try {
    switch (error.type) {
      case ErrorType.SpecNotValid: {
        let content: string = error.content;
        if (error.content.startsWith("ResolverError: Error downloading")) {
          content = error.content
            .split("\n")
            .map((o) => o.trim())
            .join(". ");
          content = `${content}. ${getLocalizedString("core.common.ErrorFetchApiSpec")}`;
        }
        return content;
      }

      case ErrorType.RemoteRefNotSupported:
        return getLocalizedString("core.common.RemoteRefNotSupported", error.data.join(", "));
      case ErrorType.NoServerInformation:
        return getLocalizedString("core.common.NoServerInformation");
      case ErrorType.UrlProtocolNotSupported:
        return getLocalizedString("core.common.UrlProtocolNotSupported", error.data);
      case ErrorType.RelativeServerUrlNotSupported:
        return getLocalizedString("core.common.RelativeServerUrlNotSupported");
      case ErrorType.NoSupportedApi:
        const messages = [];
        const invalidAPIInfo = error.data as InvalidAPIInfo[];
        for (const info of invalidAPIInfo) {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          const mes = `${info.api}: ${info.reason.map(mapInvalidReasonToMessage).join(", ")}`;
          messages.push(mes);
        }

        if (messages.length === 0) {
          messages.push(getLocalizedString("core.common.invalidReason.NoAPIs"));
        }
        return isPlugin
          ? getLocalizedString("core.common.NoSupportedApiCopilot", messages.join("\n"))
          : getLocalizedString("core.common.NoSupportedApi", messages.join("\n"));
      case ErrorType.NoExtraAPICanBeAdded:
        return isPlugin
          ? getLocalizedString("error.copilot.noExtraAPICanBeAdded")
          : getLocalizedString("error.apime.noExtraAPICanBeAdded");
      case ErrorType.ResolveServerUrlFailed:
        return error.content;
      case ErrorType.Cancelled:
        return getLocalizedString("core.common.CancelledMessage");
      case ErrorType.SwaggerNotSupported:
        return getLocalizedString("core.common.SwaggerNotSupported");
      case ErrorType.SpecVersionNotSupported:
        return getLocalizedString("core.common.SpecVersionNotSupported", error.data);

      default:
        return error.content;
    }
  } catch (e) {
    return error.content;
  }
}

interface SpecObject {
  pathUrl: string;
  method: string;
  item: OpenAPIV3.OperationObject;
  auth: boolean;
}

function parseSpec(spec: OpenAPIV3.Document): [SpecObject[], boolean] {
  const res: SpecObject[] = [];
  let needAuth = false;

  const paths = spec.paths;
  if (paths) {
    for (const pathUrl in paths) {
      const pathItem = paths[pathUrl];
      if (pathItem) {
        const operations = pathItem;
        for (const method in operations) {
          if (method === "get" || method === "post") {
            const operationItem = (operations as any)[method] as OpenAPIV3.OperationObject;
            if (operationItem) {
              const authResult = Utils.getAuthArray(operationItem.security, spec);
              const hasAuth = authResult.length != 0;
              if (hasAuth) {
                needAuth = true;
              }
              res.push({
                item: operationItem,
                method: method,
                pathUrl: pathUrl,
                auth: hasAuth,
              });
            }
          }
        }
      }
    }
  }

  return [res, needAuth];
}

async function updatePromptForCustomApi(
  spec: OpenAPIV3.Document,
  language: string,
  chatFolder: string
): Promise<void> {
  if (language === ProgrammingLanguage.JS || language === ProgrammingLanguage.TS) {
    const promptFilePath = path.join(chatFolder, "skprompt.txt");
    const prompt = `The following is a conversation with an AI assistant.\nThe assistant can help to call APIs for the open api spec file${
      spec.info.description ? ". " + spec.info.description : "."
    }\nIf the API doesn't require parameters, invoke it with default JSON object { "path": null, "body": null, "query": null }.\n\ncontext:\nAvailable actions: {{getAction}}.`;
    await fs.writeFile(promptFilePath, prompt, { encoding: "utf-8", flag: "w" });
  }
}

async function updateAdaptiveCardForCustomApi(
  specItems: SpecObject[],
  language: string,
  destinationPath: string
): Promise<void> {
  if (language === ProgrammingLanguage.JS || language === ProgrammingLanguage.TS) {
    const adaptiveCardsFolderPath = path.join(destinationPath, "src", "adaptiveCards");
    await fs.ensureDir(adaptiveCardsFolderPath);

    for (const item of specItems) {
      const name = item.item.operationId;
      const [card] = AdaptiveCardGenerator.generateAdaptiveCard(item.item);
      const cardFilePath = path.join(adaptiveCardsFolderPath, `${name!}.json`);
      await fs.writeFile(cardFilePath, JSON.stringify(card, null, 2));
    }
  }
}

async function updateActionForCustomApi(
  specItems: SpecObject[],
  language: string,
  chatFolder: string
): Promise<void> {
  if (language === ProgrammingLanguage.JS || language === ProgrammingLanguage.TS) {
    const actionsFilePath = path.join(chatFolder, "actions.json");
    const actions = [];

    for (const item of specItems) {
      const parameters: any = {
        type: "object",
        properties: {} as OpenAPIV3.SchemaObject,
        required: [],
      };

      const paramObject = item.item.parameters as OpenAPIV3.ParameterObject[];
      if (paramObject) {
        for (let i = 0; i < paramObject.length; i++) {
          const param = paramObject[i];
          const schema = param.schema as OpenAPIV3.SchemaObject;
          const paramType = param.in;

          if (!parameters.properties[paramType]) {
            parameters.properties[paramType] = {
              type: "object",
              properties: {},
              required: [],
            };
          }
          parameters.properties[paramType].properties[param.name] = schema;
          parameters.properties[paramType].properties[param.name].description =
            param.description ?? "";
          if (param.required) {
            parameters.properties[paramType].required.push(param.name);
            if (!parameters.required.includes(paramType)) {
              parameters.required.push(paramType);
            }
          }
        }
      }

      actions.push({
        name: item.item.operationId,
        description: item.item.description ?? item.item.summary,
        parameters: parameters,
      });
    }

    await fs.writeFile(actionsFilePath, JSON.stringify(actions, null, 2));
  }
}

const ActionCode = {
  javascript: `
app.ai.action("{{operationId}}", async (context, state, parameter) => {
  const client = await api.getClient();
  // Add authentication configuration for the client
  const path = client.paths["{{pathUrl}}"];
  if (path && path.{{method}}) {
    const result = await path.{{method}}(parameter.path, parameter.body, {
      params: parameter.query,
    });
    const card = generateAdaptiveCard("../adaptiveCards/{{operationId}}.json", result);
    await context.sendActivity({ attachments: [card] });
  } else {
    await context.sendActivity("no result");
  }
  return "result";
});
  `,
  typescript: `
app.ai.action("{{operationId}}", async (context: TurnContext, state: ApplicationTurnState, parameter: any) => {
  const client = await api.getClient();
  // Add authentication configuration for the client
  const path = client.paths["{{pathUrl}}"];
  if (path && path.{{method}}) {
    const result = await path.{{method}}(parameter.path, parameter.body, {
      params: parameter.query,
    });
    const card = generateAdaptiveCard("../adaptiveCards/{{operationId}}.json", result);
    await context.sendActivity({ attachments: [card] });
  } else {
    await context.sendActivity("no result");
  }
  return "result";
});
  `,
};

const AuthCode = {
  javascript: {
    actionCode: `addAuthConfig(client);`,
    actionPlaceholder: `// Add authentication configuration for the client`,
  },
  typescript: {
    actionCode: `addAuthConfig(client);`,
    actionPlaceholder: `// Add authentication configuration for the client`,
  },
};

async function updateCodeForCustomApi(
  specItems: SpecObject[],
  language: string,
  destinationPath: string,
  openapiSpecFileName: string,
  needAuth: boolean
): Promise<void> {
  if (language === ProgrammingLanguage.JS || language === ProgrammingLanguage.TS) {
    const codeTemplate =
      ActionCode[language === ProgrammingLanguage.JS ? "javascript" : "typescript"];
    const appFolderPath = path.join(destinationPath, "src", "app");

    const actionsCode = [];
    const authCodeTemplate =
      AuthCode[language === ProgrammingLanguage.JS ? "javascript" : "typescript"];
    for (const item of specItems) {
      const auth = item.auth;
      const code = codeTemplate
        .replace(authCodeTemplate.actionPlaceholder, auth ? authCodeTemplate.actionCode : "")
        .replace(/{{operationId}}/g, item.item.operationId!)
        .replace(/{{pathUrl}}/g, item.pathUrl)
        .replace(/{{method}}/g, item.method);
      actionsCode.push(code);
    }

    // Update code in app file
    const indexFilePath = path.join(
      appFolderPath,
      language === ProgrammingLanguage.JS ? "app.js" : "app.ts"
    );
    const indexFileContent = (await fs.readFile(indexFilePath)).toString();
    const updateIndexFileContent = indexFileContent
      .replace("{{OPENAPI_SPEC_PATH}}", openapiSpecFileName)
      .replace("// Replace with action code", actionsCode.join("\n"));
    await fs.writeFile(indexFilePath, updateIndexFileContent);
  }
}

export async function updateForCustomApi(
  spec: OpenAPIV3.Document,
  language: string,
  destinationPath: string,
  openapiSpecFileName: string
): Promise<void> {
  const chatFolder = path.join(destinationPath, "src", "prompts", "chat");
  await fs.ensureDir(chatFolder);

  // 1. update prompt folder
  await updatePromptForCustomApi(spec, language, chatFolder);

  const [specItems, needAuth] = parseSpec(spec);

  // 2. update adaptive card folder
  await updateAdaptiveCardForCustomApi(specItems, language, destinationPath);

  // 3. update actions file
  await updateActionForCustomApi(specItems, language, chatFolder);

  // 4. update code
  await updateCodeForCustomApi(specItems, language, destinationPath, openapiSpecFileName, needAuth);
}

const EnvNameMapping: { [authType: string]: string } = {
  apiKey: "REGISTRATION_ID",
  oauth2: "CONFIGURATION_ID",
};

export function getEnvName(authName: string, authType?: string): string {
  return Utils.getSafeRegistrationIdEnvName(`${authName}_${EnvNameMapping[authType ?? "apiKey"]}`);
}
