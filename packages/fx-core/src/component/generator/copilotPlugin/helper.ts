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
  Platform,
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
} from "../../../common/spec-parser";
import fs from "fs-extra";
import { getLocalizedString } from "../../../common/localizeUtils";
import { MissingRequiredInputError } from "../../../error";
import { EOL } from "os";
import { SummaryConstant } from "../../configManager/constant";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";
import path from "path";
import { isApiKeyEnabled, isMultipleParametersEnabled } from "../../../common/featureFlags";

const manifestFilePath = "/.well-known/ai-plugin.json";
const componentName = "OpenAIPluginManifestHelper";

const enum telemetryProperties {
  validationStatus = "validation-status",
  validationErrors = "validation-errors",
  validationWarnings = "validation-warnings",
}

const enum telemetryEvents {
  validateApiSpec = "validate-api-spec",
  validateOpenAiPluginManifest = "validate-openai-plugin-manifest",
}

enum OpenAIPluginManifestErrorType {
  AuthNotSupported = "openai-pliugin-auth-not-supported",
  ApiUrlMissing = "openai-plugin-api-url-missing",
}

export const specParserGenerateResultTelemetryEvent = "spec-parser-generate-result";
export const specParserGenerateResultAllSuccessTelemetryProperty = "all-success";
export const specParserGenerateResultWarningsTelemetryProperty = "warnings";

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
  teamsManifestPath: string | undefined,
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

  try {
    const allowAPIKeyAuth = isApiKeyEnabled();
    const allowMultipleParameters = isMultipleParametersEnabled();
    const specParser = new SpecParser(apiSpecUrl as string, {
      allowAPIKeyAuth,
      allowMultipleParameters,
    });
    const validationRes = await specParser.validate();
    validationRes.errors = formatValidationErrors(validationRes.errors);

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

    let operations: ListAPIResult[] = await specParser.list();

    // Filter out exsiting APIs
    if (!includeExistingAPIs) {
      if (!teamsManifestPath) {
        throw new MissingRequiredInputError("teamsManifestPath", "inputs");
      }
      const manifest = await manifestUtils._readAppManifest(teamsManifestPath);
      if (manifest.isOk()) {
        const existingOperationIds = manifestUtils.getOperationIds(manifest.value);

        const existingOperations = existingOperationIds.map(
          (key) => operations.find((item) => item.operationId === key)?.api
        );

        operations = operations.filter(
          (operation: ListAPIResult) => !existingOperations.includes(operation.api)
        );
        // No extra API can be added
        if (operations.length == 0) {
          const errors = [
            {
              type: ApiSpecErrorType.NoExtraAPICanBeAdded,
              content: getLocalizedString("error.copilotPlugin.noExtraAPICanBeAdded"),
            },
          ];
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

function sortOperations(operations: ListAPIResult[]): ApiOperation[] {
  const operationsWithSeparator: ApiOperation[] = [];
  for (const operation of operations) {
    const arr = operation.api.toUpperCase().split(" ");
    const result: ApiOperation = {
      id: operation.api,
      label: operation.api,
      groupName: arr[0],
      data: {
        serverUrl: operation.server,
      },
    };

    if (operation.auth && operation.auth.type === "apiKey") {
      result.data.authName = operation.auth.name;
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
  return result.type.toString() + ": " + result.content;
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
  projectPath: string
): string {
  const apiSpecFileName =
    teamsManifest.composeExtensions?.length &&
    teamsManifest.composeExtensions[0].apiSpecificationFile
      ? teamsManifest.composeExtensions[0].apiSpecificationFile
      : "";
  const apiSpecWarningMessage = formatApiSpecValidationWarningMessage(
    warnings,
    path.join(AppPackageFolderName, apiSpecFileName)
  );
  const manifestWarningResult = validateTeamsManifestLength(teamsManifest, projectPath, warnings);
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
  apiSpecFileName: string
): string[] {
  const resultWarnings = [];
  const operationIdWarning = specWarnings.find((w) => w.type === WarningType.OperationIdMissing);

  if (operationIdWarning) {
    resultWarnings.push(
      getLocalizedString(
        "core.copilotPlugin.scaffold.summary.warning.operationId",
        `${SummaryConstant.NotExecuted} ${operationIdWarning.content}`,
        ManifestTemplateFileName
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
  projectPath: string,
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

export function formatValidationErrors(errors: ApiSpecErrorResult[]): ApiSpecErrorResult[] {
  return errors.map((error) => {
    return {
      type: error.type,
      content: formatValidationErrorContent(error),
      data: error.data,
    };
  });
}

function formatValidationErrorContent(error: ApiSpecErrorResult): string {
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
        return getLocalizedString("core.common.NoSupportedApi");
      case ErrorType.NoExtraAPICanBeAdded:
        return getLocalizedString("error.copilotPlugin.noExtraAPICanBeAdded");
      case ErrorType.ResolveServerUrlFailed:
        return error.content;
      case ErrorType.Cancelled:
        return getLocalizedString("core.common.CancelledMessage");
      case ErrorType.SwaggerNotSupported:
        return getLocalizedString("core.common.SwaggerNotSupported");

      default:
        return error.content;
    }
  } catch (e) {
    return error.content;
  }
}
