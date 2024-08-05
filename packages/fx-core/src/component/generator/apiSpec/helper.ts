// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import {
  AdaptiveCardGenerator,
  ErrorResult as ApiSpecErrorResult,
  ErrorType as ApiSpecErrorType,
  ErrorType,
  InvalidAPIInfo,
  ListAPIResult,
  ParseOptions,
  ProjectType,
  SpecParser,
  SpecParserError,
  Utils,
  ValidationStatus,
  WarningResult,
  WarningType,
} from "@microsoft/m365-spec-parser";
import { ListAPIInfo } from "@microsoft/m365-spec-parser/dist/src/interfaces";
import {
  ApiOperation,
  AppPackageFolderName,
  Context,
  FxError,
  Inputs,
  ManifestTemplateFileName,
  ManifestUtil,
  Result,
  SystemError,
  TeamsAppManifest,
  UserError,
  Warning,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import axios, { AxiosResponse } from "axios";
import fs from "fs-extra";
import { OpenAPIV3 } from "openapi-types";
import { EOL } from "os";
import path from "path";
import { FeatureFlags, featureFlagManager } from "../../../common/featureFlags";
import { getLocalizedString } from "../../../common/localizeUtils";
import { MissingRequiredInputError } from "../../../error";
import {
  apiPluginApiSpecOptionId,
  CustomCopilotRagOptions,
  ProgrammingLanguage,
  QuestionNames,
} from "../../../question/constants";
import { SummaryConstant } from "../../configManager/constant";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";
import { pluginManifestUtils } from "../../driver/teamsApp/utils/PluginManifestUtils";
import { sendTelemetryErrorEvent } from "../../../common/telemetry";

const enum telemetryProperties {
  validationStatus = "validation-status",
  validationErrors = "validation-errors",
  specNotValidDetails = "spec-not-valid-details",
  validationWarnings = "validation-warnings",
  validApisCount = "valid-apis-count",
  allApisCount = "all-apis-count",
  bearerTokenAuthCount = "bearer-token-auth-count",
  oauth2AuthCount = "oauth2-auth-count",
  otherAuthCount = "other-auth-count",
  isFromAddingApi = "is-from-adding-api",
  failedReason = "failed-reason",
}

const enum telemetryEvents {
  validateApiSpec = "validate-api-spec",
  listApis = "spec-parser-list-apis-result",
  failedToGetGenerateWarning = "failed-to-get-generate-warning",
}

export const copilotPluginParserOptions: ParseOptions = {
  allowAPIKeyAuth: false,
  allowBearerTokenAuth: true,
  allowMultipleParameters: true,
  allowOauth2: true,
  projectType: ProjectType.Copilot,
  allowMissingId: true,
  allowSwagger: true,
  allowMethods: ["get", "post", "put", "delete", "patch", "head", "connect", "options", "trace"],
  allowResponseSemantics: true,
  allowConversationStarters: true,
  allowConfirmation: false, // confirmation is not stable for public preview in Sydney, so it's temporarily set to false
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
  type: ApiSpecErrorType;

  /**
   * The content of the error.
   */
  content: string;

  data?: any;
}

export async function listOperations(
  context: Context,
  apiSpecUrl: string | undefined,
  inputs: Inputs,
  includeExistingAPIs = true,
  shouldLogWarning = true,
  existingCorrelationId?: string
): Promise<Result<ApiOperation[], ErrorResult[]>> {
  const isPlugin =
    inputs[QuestionNames.ApiPluginType] === apiPluginApiSpecOptionId ||
    !!inputs[QuestionNames.PluginAvailability];
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
            allowOauth2: featureFlagManager.getBooleanValue(FeatureFlags.SMEOAuth),
          }
    );
    const validationRes = await specParser.validate();
    validationRes.errors = formatValidationErrors(validationRes.errors, inputs);

    logValidationResults(
      validationRes.errors,
      validationRes.warnings,
      context,
      shouldLogWarning,
      false,
      existingCorrelationId
    );
    if (validationRes.status === ValidationStatus.Error) {
      return err(validationRes.errors);
    }

    const listResult: ListAPIResult = await specParser.list();

    const invalidAPIs = listResult.APIs.filter((value) => !value.isValid);
    for (const invalidAPI of invalidAPIs) {
      context.logProvider.warning(
        `${invalidAPI.api} ${getLocalizedString(
          "core.copilotPlugin.list.unsupportedBecause"
        )} ${invalidAPI.reason.map(mapInvalidReasonToMessage).join(", ")}`
      );
    }

    const bearerTokenAuthAPIs = listResult.APIs.filter(
      (api) => api.auth && Utils.isBearerTokenAuth(api.auth.authScheme)
    );

    const oauth2AuthAPIs = listResult.APIs.filter(
      (api) => api.auth && Utils.isOAuthWithAuthCodeFlow(api.auth.authScheme)
    );

    const otherAuthAPIs = listResult.APIs.filter(
      (api) =>
        api.auth &&
        !Utils.isOAuthWithAuthCodeFlow(api.auth.authScheme) &&
        !Utils.isBearerTokenAuth(api.auth.authScheme)
    );

    let operations = listResult.APIs.filter((value) => value.isValid);
    context.telemetryReporter.sendTelemetryEvent(telemetryEvents.listApis, {
      [telemetryProperties.validApisCount]: listResult.validAPICount.toString(),
      [telemetryProperties.allApisCount]: listResult.allAPICount.toString(),
      [telemetryProperties.isFromAddingApi]: (!includeExistingAPIs).toString(),
      [telemetryProperties.bearerTokenAuthCount]: bearerTokenAuthAPIs.length.toString(),
      [telemetryProperties.oauth2AuthCount]: oauth2AuthAPIs.length.toString(),
      [telemetryProperties.otherAuthCount]: otherAuthAPIs.length.toString(),
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
        let isOriginalSpec;

        if (isPlugin) {
          existingOperations = await listPluginExistingOperations(
            manifest.value,
            teamsManifestPath,
            inputs[QuestionNames.DestinationApiSpecFilePath]
          );

          const operationAPIs = operations.map((operation) => operation.api);
          isOriginalSpec = existingOperations.every((operation) =>
            operationAPIs.includes(operation)
          );
        } else {
          const existingOperationIds = manifestUtils.getOperationIds(manifest.value);
          existingOperations = operations
            .filter((operation) => existingOperationIds.includes(operation.operationId))
            .map((operation) => operation.api);

          isOriginalSpec = existingOperations.length === existingOperationIds.length;
        }

        if (!isOriginalSpec) {
          const errors = formatValidationErrors(
            [
              {
                type: ApiSpecErrorType.AddedAPINotInOriginalSpec,
                content: "",
              },
            ],
            inputs
          );

          logValidationResults(errors, [], context, true, false, existingCorrelationId);
          return err(errors);
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
          logValidationResults(errors, [], context, true, false, existingCorrelationId);
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

    const specNotValidError = errors.find((error) => error.type === ErrorType.SpecNotValid);
    if (specNotValidError) {
      properties[telemetryProperties.specNotValidDetails] = specNotValidError.content;
    }

    if (existingCorrelationId) {
      properties["correlation-id"] = existingCorrelationId;
    }
    context.telemetryReporter.sendTelemetryEvent(telemetryEvents.validateApiSpec, properties);
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

  const outputMessage =
    EOL +
    getLocalizedString(
      "core.copilotPlugin.validate.apiSpec.summary",
      summaryStr.join(", "),
      errorMessage,
      warningMessage
    );

  void context.logProvider.info(outputMessage);
}

/**
 * Generate scaffolding warning summary.
 * @param warnings warnings returned from spec-parser.
 * @param teamsManifest Teams manifest.
 * @param apiSpecFilePath API spec path relative of project path.
 * @param pluginManifestPath Plugin manifest path relative of project path.
 * @param projectPath Project path.
 * @returns Warning message.
 */
export async function generateScaffoldingSummary(
  warnings: Warning[],
  teamsManifest: TeamsAppManifest,
  apiSpecFilePath: string,
  pluginManifestPath: string | undefined,
  projectPath: string
): Promise<string> {
  const apiSpecWarningMessage = formatApiSpecValidationWarningMessage(
    warnings,
    apiSpecFilePath,
    teamsManifest
  );
  const manifestWarningResult = validateTeamsManifestLength(teamsManifest, warnings);
  const manifestWarningMessage = manifestWarningResult.map((warn) => {
    return `${SummaryConstant.NotExecuted} ${warn}`;
  });

  let pluginWarningMessage: string[] = [];
  if (pluginManifestPath) {
    const pluginManifestWarningResult = await validatePluginManifestLength(
      pluginManifestPath,
      projectPath,
      warnings
    );
    pluginWarningMessage = pluginManifestWarningResult.map((warn) => {
      return `${SummaryConstant.NotExecuted} ${warn}`;
    });
  }

  if (
    apiSpecWarningMessage.length ||
    manifestWarningMessage.length ||
    pluginWarningMessage.length
  ) {
    let details = "";
    if (apiSpecWarningMessage.length) {
      details += EOL + apiSpecWarningMessage.join(EOL);
    }

    if (manifestWarningMessage.length) {
      details += EOL + manifestWarningMessage.join(EOL);
    }

    if (pluginWarningMessage.length) {
      details += EOL + pluginWarningMessage.join(EOL);
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

    if (optionalParamsOnlyWarnings) {
      for (const optionalParamsOnlyWarning of optionalParamsOnlyWarnings) {
        resultWarnings.push(
          getLocalizedString(
            "core.copilotPlugin.scaffold.summary.warning.api.optionalParametersOnly",
            optionalParamsOnlyWarning.data.commandId,
            optionalParamsOnlyWarning.data.commandId
          ) +
            getLocalizedString(
              "core.copilotPlugin.scaffold.summary.warning.api.optionalParametersOnly.mitigation",
              optionalParamsOnlyWarning.data.parameterName,
              optionalParamsOnlyWarning.data.commandId,
              path.join(AppPackageFolderName, ManifestTemplateFileName),
              path.join(
                AppPackageFolderName,
                teamsManifest.composeExtensions![0].apiSpecificationFile ?? ""
              )
            )
        );
      }
    }

    const commands = teamsManifest.composeExtensions![0].commands;

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

async function validatePluginManifestLength(
  pluginManifestPath: string,
  projectPath: string,
  warnings: Warning[]
): Promise<string[]> {
  const functionDescriptionLimit = 100;
  const resultWarnings: string[] = [];

  const manifestRes = await pluginManifestUtils.readPluginManifestFile(
    path.join(projectPath, pluginManifestPath)
  );
  if (manifestRes.isErr()) {
    sendTelemetryErrorEvent(
      "spec-generator",
      telemetryEvents.failedToGetGenerateWarning,
      manifestRes.error
    );
    return [];
  }

  // validate function description
  const functions = manifestRes.value.functions;
  const functionDescriptionWarnings = warnings
    .filter((w) => w.type === WarningType.FuncDescriptionTooLong)
    .map((w) => w.data);
  if (functions) {
    functions.forEach((func) => {
      if (!func.description) {
        resultWarnings.push(
          getLocalizedString(
            "core.copilotPlugin.scaffold.summary.warning.pluginManifest.missingFunctionDescription",
            func.name
          ) +
            getLocalizedString(
              "core.copilotPlugin.scaffold.summary.warning.pluginManifest.missingFunctionDescription.mitigation",
              func.name,
              pluginManifestPath
            )
        );
      } else if (func.name in functionDescriptionWarnings) {
        resultWarnings.push(
          getLocalizedString(
            "core.copilotPlugin.scaffold.summary.warning.pluginManifest.functionDescription.lengthExceeding",
            func.name,
            functionDescriptionLimit
          ) +
            getLocalizedString(
              "core.copilotPlugin.scaffold.summary.warning.pluginManifest.functionDescription.lengthExceeding.mitigation",
              func.name,
              pluginManifestPath
            )
        );
      }
    });
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
  const isPlugin = inputs[QuestionNames.ApiPluginType] === apiPluginApiSpecOptionId;
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
      case ErrorType.AddedAPINotInOriginalSpec:
        return getLocalizedString("core.common.AddedAPINotInOriginalSpec");

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

const commonLanguages = [ProgrammingLanguage.TS, ProgrammingLanguage.JS, ProgrammingLanguage.PY];

async function updatePromptForCustomApi(
  spec: OpenAPIV3.Document,
  language: string,
  chatFolder: string
): Promise<void> {
  if (commonLanguages.includes(language as ProgrammingLanguage)) {
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
  if (commonLanguages.includes(language as ProgrammingLanguage)) {
    const adaptiveCardsFolderPath = path.join(destinationPath, "src", "adaptiveCards");
    await fs.ensureDir(adaptiveCardsFolderPath);

    for (const item of specItems) {
      const name = item.item.operationId!.replace(/[^a-zA-Z0-9]/g, "_");
      const [card] = AdaptiveCardGenerator.generateAdaptiveCard(item.item, true);
      const cardFilePath = path.join(adaptiveCardsFolderPath, `${name}.json`);
      await fs.writeFile(cardFilePath, JSON.stringify(card, null, 2));
    }
  }
}

async function updateActionForCustomApi(
  specItems: SpecObject[],
  language: string,
  chatFolder: string
): Promise<void> {
  if (commonLanguages.includes(language as ProgrammingLanguage)) {
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
    const cardName = "{{operationId}}".replace(/[^a-zA-Z0-9]/g, "_");
    const card = generateAdaptiveCard("../adaptiveCards/" + cardName + ".json", result);
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
    const cardName = "{{operationId}}".replace(/[^a-zA-Z0-9]/g, "_");
    const card = generateAdaptiveCard("../adaptiveCards/" + cardName + ".json", result);
    await context.sendActivity({ attachments: [card] });
  } else {
    await context.sendActivity("no result");
  }
  return "result";
});
  `,
  python: `
@bot_app.ai.action("{{operationId}}")
async def {{operationId}}(
  context: ActionTurnContext[Dict[str, Any]],
  state: AppTurnState,
):
  parameters = context.data
  path = parameters.get("path", {})
  body = parameters.get("body", {})
  query = parameters.get("query", {})
  resp = client.{{operationId}}(**path, json=body, _headers={}, _params=query, _cookies={})

  if resp.status_code != 200:
    await context.send_activity(resp.reason)
  else:
    card_template_path = os.path.join(current_dir, 'adaptiveCards/{{operationId}}.json')
    with open(card_template_path) as card_template_file:
        adaptive_card_template = card_template_file.read()

    renderer = AdaptiveCardRenderer(adaptive_card_template)

    json_resoponse_str = resp.text
    rendered_card_str = renderer.render(json_resoponse_str)
    rendered_card_json = json.loads(rendered_card_str)
    card = CardFactory.adaptive_card(rendered_card_json)
    message = MessageFactory.attachment(card)
    
    await context.send_activity(message)
  return "success"
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
  } else if (language === ProgrammingLanguage.PY) {
    // Update code in bot.py
    const actionsCode = [];
    const codeTemplate = ActionCode["python"];
    for (const item of specItems) {
      const code = codeTemplate
        .replace(/{{operationId}}/g, item.item.operationId!)
        .replace(/{{pathUrl}}/g, item.pathUrl)
        .replace(/{{method}}/g, item.method);
      actionsCode.push(code);
    }

    const botFilePath = path.join(destinationPath, "src", "bot.py");
    const botFileContent = (await fs.readFile(botFilePath)).toString();
    const updateBotFileContent = botFileContent
      .replace("{{OPENAPI_SPEC_PATH}}", openapiSpecFileName)
      .replace("# Replace with action code", actionsCode.join("\n"));
    await fs.writeFile(botFilePath, updateBotFileContent);
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
