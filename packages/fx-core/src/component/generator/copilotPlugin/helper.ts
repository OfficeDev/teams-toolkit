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
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";
import path from "path";
import { getLocalizedString } from "../../../common/localizeUtils";
import { EOL } from "os";
import { SummaryConstant } from "../../configManager/constant";

const manifestFilePath = "/.well-known/ai-plugin.json";
const teamsFxEnv = "${{TEAMSFX_ENV}}";
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
  AuthNotSupported,
  ApiUrlMissing,
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
    appPackageFolder: string
  ): Promise<Result<undefined, FxError>> {
    const manifestPath = path.join(appPackageFolder, "manifest.json");
    const manifestRes = await manifestUtils._readAppManifest(manifestPath);

    if (manifestRes.isErr()) {
      return err(manifestRes.error);
    }

    const manifest = manifestRes.value;
    manifest.name.full = openAiPluginManifest.name_for_model;
    manifest.name.short = `${openAiPluginManifest.name_for_human}-${teamsFxEnv}`;
    manifest.description.full = openAiPluginManifest.description_for_model;
    manifest.description.short = openAiPluginManifest.description_for_human;
    manifest.developer.websiteUrl = openAiPluginManifest.legal_info_url;
    manifest.developer.privacyUrl = openAiPluginManifest.legal_info_url;
    manifest.developer.termsOfUseUrl = openAiPluginManifest.legal_info_url;

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, "\t"), "utf-8");
    return ok(undefined);
  }
}

export async function listOperations(
  context: Context,
  manifest: OpenAIPluginManifest | undefined,
  apiSpecUrl: string | undefined,
  shouldLogWarning = true
): Promise<Result<string[], ErrorResult[]>> {
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
  return ok(operations);
}

function formatTelemetryValidationProperty(result: ErrorResult | WarningResult): string {
  return result.type.toString() + ":" + result.content;
}

function logValidationResults(
  errors: ErrorResult[],
  warnings: WarningResult[],
  context: Context,
  isApiSpec: boolean,
  shouldLogWarning: boolean
) {
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

  if (errors.length === 0 && warnings.length === 0) {
    return;
  }
  const errorMessage = errors
    .map((error) => {
      return `${SummaryConstant.Failed} ${error.content}`;
    })
    .join(EOL);
  const warningMessage = warnings
    .map((warning) => {
      return `${SummaryConstant.NotExecuted} ${warning.content}`;
    })
    .join(EOL);

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

  context.logProvider?.info(outputMessage);
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
