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
  err,
  ok,
} from "@microsoft/teamsfx-api";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { sendRequestWithRetry } from "../utils";
import {
  ErrorType as ApiSpecErrorType,
  ValidationStatus,
} from "../../../common/spec-parser/interfaces";
import { SpecParser } from "../../../common/spec-parser/specParser";
import fs from "fs-extra";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";
import path from "path";

const manifestFilePath = "/.well-known/ai-plugin.json";

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

  /**
   * The api path of the error.
   */
  apiPath?: string;
}

export class OpenAIManifestHelper {
  static async loadOpenAIPluginManifest(domain: string): Promise<OpenAIPluginManifest> {
    const path = domain + manifestFilePath;
    const res: AxiosResponse<any> = await sendRequestWithRetry(async () => {
      return await axios.get(path);
    }, 3);
    return res.data;
  }

  static async updateManifest(
    context: Context,
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
    manifest.name.short = openAiPluginManifest.name_for_human;
    manifest.description.full = openAiPluginManifest.description_for_model;
    manifest.description.short = openAiPluginManifest.description_for_human;
    manifest.developer.websiteUrl = openAiPluginManifest.legal_info_url;
    manifest.developer.privacyUrl = openAiPluginManifest.legal_info_url;
    manifest.developer.termsOfUseUrl = openAiPluginManifest.legal_info_url;

    try {
      const legalInfoRes: AxiosResponse<any> = await sendRequestWithRetry(async () => {
        return await axios.get(openAiPluginManifest.logo_url, { responseType: "arraybuffer" });
      }, 3);

      if (legalInfoRes.data) {
        const iconPath = path.join(appPackageFolder, manifest.icons.color);
        await fs.writeFile(iconPath, legalInfoRes.data);
      }
    } catch (e) {
      // TODO: log error and telemetry
      context.logProvider.warning(`Failed to download icon from ${openAiPluginManifest.logo_url}`);
    }

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
    apiSpecUrl = manifest.api.url;
    const errors = validateOpenAIPluginManifest(manifest);
    if (errors.length > 0) {
      return err(errors);
    }
  }

  const specParser = new SpecParser(apiSpecUrl!);
  const validationRes = await specParser.validate();

  if (validationRes.status === ValidationStatus.Error) {
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
  if (!manifest.api.url) {
    errors.push({
      type: OpenAIPluginManifestErrorType.ApiUrlMissing,
      content: "Missing url in manifest",
    });
  }

  if (manifest.auth.type !== OpenAIManifestAuthType.None) {
    errors.push({
      type: OpenAIPluginManifestErrorType.AuthNotSupported,
      content: "Auth type not supported",
    });
  }
  return errors;
}
