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
  IComposeExtension,
  SystemError,
} from "@microsoft/teamsfx-api";
import axios, { AxiosResponse } from "axios";
import { sendRequestWithRetry } from "../utils";
import {
  ErrorType as ApiSpecErrorType,
  ValidationStatus,
  WarningResult,
  WarningType,
} from "../../../common/spec-parser/interfaces";
import { SpecParser } from "../../../common/spec-parser/specParser";
import fs from "fs-extra";
import { getLocalizedString } from "../../../common/localizeUtils";
import { MissingRequiredInputError } from "../../../error";
import { EOL } from "os";
import { SummaryConstant } from "../../configManager/constant";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";
import path from "path";
import { SpecParserError } from "../../../common/spec-parser/specParserError";

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

export interface ErrorResult {
  /**
   * The type of error.
   */
  type: ApiSpecErrorType | OpenAIPluginManifestErrorType;

  /**
   * The content of the error.
   */
  content: string;
}

export class OpenAIPluginManifestHelper {
  static async loadOpenAIPluginManifest(input: string): Promise<OpenAIPluginManifest> {
    let path =
      (input.endsWith("/") ? input.substring(0, input.length - 1) : input) + manifestFilePath;
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
  shouldLogWarning = true
): Promise<Result<ApiOperation[], ErrorResult[]>> {
  if (manifest) {
    const errors = validateOpenAIPluginManifest(manifest);
    logValidationResults(errors, [], context, false, shouldLogWarning);
    if (errors.length > 0) {
      return err(errors);
    }
    apiSpecUrl = manifest.api.url;
  }

  try {
    const specParser = new SpecParser(apiSpecUrl!);
    const validationRes = await specParser.validate();

    logValidationResults(
      validationRes.errors,
      validationRes.warnings,
      context,
      true,
      shouldLogWarning
    );
    if (validationRes.status === ValidationStatus.Error) {
      return err(validationRes.errors);
    }

    let operations = await specParser.list();

    // Filter out exsiting APIs
    if (!includeExistingAPIs) {
      if (!teamsManifestPath) {
        throw new MissingRequiredInputError("teamsManifestPath", "inputs");
      }
      const manifest = await manifestUtils._readAppManifest(teamsManifestPath);
      if (manifest.isOk()) {
        const existingOperationIds = manifestUtils.getOperationIds(manifest.value);
        const operationMaps = await specParser.listOperationMap();
        const existingOperations = existingOperationIds.map((key) => operationMaps.get(key));
        operations = operations.filter(
          (operation: string) => !existingOperations.includes(operation)
        );
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

function sortOperations(operations: string[]): ApiOperation[] {
  const operationsWithSeparator: ApiOperation[] = [];
  for (const operation of operations) {
    const arr = operation.toUpperCase().split(" ");
    operationsWithSeparator.push({ id: operation, label: operation, groupName: arr[0] });
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
  shouldSkipTelemetry = false
): void {
  if (!shouldSkipTelemetry) {
    context.telemetryReporter.sendTelemetryEvent(
      isApiSpec ? telemetryEvents.validateApiSpec : telemetryEvents.validateOpenAiPluginManifest,
      {
        [telemetryProperties.validationStatus]:
          errors.length !== 0 ? "error" : warnings.length !== 0 ? "warning" : "success",
        [telemetryProperties.validationErrors]: errors
          .map((error: ErrorResult) => formatTelemetryValidationProperty(error))
          .join(";"),
        [telemetryProperties.validationWarnings]: warnings
          .map((warn: WarningResult) => formatTelemetryValidationProperty(warn))
          .join(";"),
      }
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
  specWarnings: Warning[],
  teamsManifest: TeamsAppManifest,
  projectPath: string
): string {
  const apiSpecWarningMessage = formatApiSpecValidationWarningMessage(specWarnings);
  const manifestWarningResult = validateTeamsManifestLength(teamsManifest, projectPath);
  const manifestWarningMessage = manifestWarningResult.map((warn) => {
    return `${SummaryConstant.NotExecuted} ${warn}`;
  });

  if (apiSpecWarningMessage || manifestWarningMessage.length) {
    let details = "";
    if (apiSpecWarningMessage) {
      details += EOL + apiSpecWarningMessage;
    }

    if (manifestWarningMessage.length) {
      details += EOL + manifestWarningMessage.join(EOL);
    }

    return getLocalizedString("core.copilotPlugin.scaffold.summary", details);
  } else {
    return "";
  }
}

function formatApiSpecValidationWarningMessage(specWarnings: Warning[]): string {
  const apiSpecWarning =
    specWarnings.length > 0 && specWarnings[0].type === WarningType.OperationIdMissing
      ? `${SummaryConstant.NotExecuted} ${specWarnings[0].content}`
      : "";

  return apiSpecWarning
    ? getLocalizedString(
        "core.copilotPlugin.scaffold.summary.warning.operationId",
        apiSpecWarning,
        ManifestTemplateFileName
      )
    : "";
}

function validateTeamsManifestLength(
  teamsManifest: TeamsAppManifest,
  projectPath: string
): string[] {
  const nameShortLimit = 30;
  const nameFullLimit = 100;
  const descriptionShortLimit = 80;
  const descriptionFullLimit = 4000;
  const warnings = [];

  // validate name
  if (teamsManifest.name.short.length > nameShortLimit) {
    warnings.push(formatLengthExceedingErrorMessage("/name/short", nameShortLimit));
  }

  if (!!teamsManifest.name.full && teamsManifest.name.full?.length > nameFullLimit) {
    warnings.push(formatLengthExceedingErrorMessage("/name/full", nameFullLimit));
  }

  // validate description
  if (teamsManifest.description.short.length > descriptionShortLimit) {
    warnings.push(formatLengthExceedingErrorMessage("/description/short", descriptionShortLimit));
  }
  if (!teamsManifest.description.full?.length) {
    warnings.push(
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
    warnings.push(formatLengthExceedingErrorMessage("/description/full", descriptionFullLimit));
  }

  // validate card
  if (ManifestUtil.parseCommonProperties(teamsManifest).isCopilotPlugin) {
    const commands = (teamsManifest.composeExtensions?.[0] as IComposeExtension).commands;
    for (const command of commands) {
      if (command.type === "query") {
        if (!command.apiResponseRenderingTemplate) {
          warnings.push(
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
              )
          );
        } else {
          const cardPath = path.join(
            projectPath,
            AppPackageFolderName,
            command.apiResponseRenderingTemplate
          );
          if (!fs.existsSync(cardPath)) {
            warnings.push(
              getLocalizedString(
                "core.copilotPlugin.scaffold.summary.warning.teamsAppPackagePackage.cannotFindCard",
                command.apiResponseRenderingTemplate,
                AppPackageFolderName
              ) +
                getLocalizedString(
                  "core.copilotPlugin.scaffold.summary.warning.teamsAppPackagePackage.cannotFindCard.mitigation",
                  command.apiResponseRenderingTemplate,
                  AppPackageFolderName
                )
            );
          }
        }
      }
    }
  }

  return warnings;
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
