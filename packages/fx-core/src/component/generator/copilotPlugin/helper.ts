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
} from "@microsoft/teamsfx-api";
import axios, { AxiosResponse } from "axios";
import { sendRequestWithRetry } from "../utils";
import {
  ErrorType as ApiSpecErrorType,
  ValidationStatus,
  WarningResult,
} from "../../../common/spec-parser/interfaces";
import { SpecParser } from "../../../common/spec-parser/specParser";
import fs from "fs-extra";
import { getLocalizedString } from "../../../common/localizeUtils";
import { EOL } from "os";
import { SummaryConstant } from "../../configManager/constant";

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
    let path = input + manifestFilePath;
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
    teamsAppManifest.name.full = openAiPluginManifest.name_for_model;
    teamsAppManifest.name.short = openAiPluginManifest.name_for_human;
    teamsAppManifest.description.full = openAiPluginManifest.description_for_model;
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
  shouldLogWarning = true
): Promise<Result<ApiOperation[], ErrorResult[]>> {
  if (manifest) {
    const errors = validateOpenAIPluginManifest(manifest);
    if (errors.length > 0) {
      logValidationResults(errors, [], context, false, shouldLogWarning);
      return err(errors);
    }
    apiSpecUrl = manifest.api.url;
  }

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

  const operations = await specParser.list();
  const sortedOperations = sortOperations(operations);
  return ok(sortedOperations);
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
) {
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
      content: "Missing url in manifest",
    });
  }

  if (manifest.auth?.type !== OpenAIManifestAuthType.None) {
    errors.push({
      type: OpenAIPluginManifestErrorType.AuthNotSupported,
      content: "Auth type not supported",
    });
  }
  return errors;
}

export function validateTeamsManifestLength(teamsManifest: TeamsAppManifest): string[] {
  const nameShortLimit = 30;
  const nameFullLimit = 100;
  const descriptionShortLimit = 80;
  const descriptionFullLimit = 4000;
  const warnings = [];

  // message below are copied from the validation result of Teams manifest.
  // validate name
  if (teamsManifest.name.short.length === 0) {
    warnings.push("Short name of the app cannot be empty");
  }

  if (teamsManifest.name.short.length > nameShortLimit) {
    warnings.push("/name/short must NOT have more than 30 characters");
  }

  if (!teamsManifest.name.full?.length) {
    warnings.push("Full name cannot be empty");
  }

  if (teamsManifest.name.full!.length > nameFullLimit) {
    warnings.push("/name/full must NOT have more than 100 characters");
  }

  // validate description
  if (teamsManifest.description.short.length === 0) {
    warnings.push("Short Description can not be empty");
  }
  if (teamsManifest.description.short.length > descriptionShortLimit) {
    warnings.push("/description/short must NOT have more than 80 characters");
  }
  if (teamsManifest.description.full?.length === 0) {
    warnings.push("Full Description can not be empty");
  }
  if (teamsManifest.description.full!.length > descriptionFullLimit) {
    warnings.push("/description/full must NOT have more than 4000 characters");
  }

  return warnings;
}
