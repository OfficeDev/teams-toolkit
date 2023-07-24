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
} from "../../../common/spec-parser/interfaces";
import { SpecParser } from "../../../common/spec-parser/specParser";
import fs from "fs-extra";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";
import path from "path";
import { getLocalizedString } from "../../../common/localizeUtils";

const manifestFilePath = "/.well-known/ai-plugin.json";
const teamsFxEnv = "${{TEAMSFX_ENV}}";
const componentName = "OpenAIPluginManifestHelper";

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
      return err(errors);
    }
    apiSpecUrl = manifest.api.url;
  }

  const specParser = new SpecParser(apiSpecUrl!);
  const validationRes = await specParser.validate();

  if (validationRes.status === ValidationStatus.Error) {
    for (const error of validationRes.errors) {
      context.logProvider.error(error.content);
    }
    return err(validationRes.errors);
  }

  if (shouldLogWarning && validationRes.warnings.length > 0) {
    for (const warning of validationRes.warnings) {
      context.logProvider.warning(warning.content);
    }
  }

  const operations = await specParser.list();
  return ok(operations);
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
