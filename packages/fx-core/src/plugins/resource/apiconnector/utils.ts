// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { Inputs } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { LanguageType, FileType } from "./constants";
import { ErrorMessage } from "./errors";
import { ResultFactory } from "./result";
import { getLocalizedString } from "../../../common/localizeUtils";

export function generateTempFolder(): string {
  const timestamp = Date.now();
  const backupFolderName = "ApiConnectorBackup-" + timestamp;
  return backupFolderName;
}

export function getSampleFileName(apiName: string, languageType: string) {
  const languageExt = languageType === LanguageType.JS ? FileType.JS : FileType.TS;
  return apiName + "." + languageExt;
}

export async function copyFileIfExist(srcFile: string, targetFile: string) {
  if (await fs.pathExists(srcFile)) {
    await fs.copyFile(srcFile, targetFile);
  }
}

export async function removeFileIfExist(file: string) {
  if (await fs.pathExists(file)) {
    await fs.remove(file);
  }
}

export function checkInputEmpty(inputs: Inputs, ...keys: string[]) {
  for (const key of keys) {
    if (!inputs[key]) {
      throw ResultFactory.SystemError(
        ErrorMessage.ApiConnectorInputError.name,
        ErrorMessage.ApiConnectorInputError.message(key)
      );
    }
  }
}

export class Notification {
  public static readonly READ_MORE = getLocalizedString("core.Notification.ReadMore");
  public static readonly READ_MORE_URL = "https://aka.ms/teamsfx-connect-api";

  public static GetBasiString(apiName: string, components: string[], languageType: string): string {
    const fileName = getSampleFileName(apiName, languageType);
    return getLocalizedString(
      "plugins.apiConnector.Notification.GenerateFiles",
      fileName,
      components.toString()
    );
  }

  public static GetBasicAuthString(apiName: string, components: string[]): string {
    const apiNameEx = apiName.toUpperCase();
    const envName = `API_${apiNameEx}_PASSWORD`;
    return getLocalizedString(
      "plugins.apiConnector.Notification.BasicAuth",
      envName,
      components.toString()
    );
  }

  public static GetCertAuthString(apiName: string, components: string[]): string {
    return getLocalizedString(
      "plugins.apiConnector.Notification.CertAuth",
      "<your-certfication-content>"
    );
  }

  public static GetApiKeyAuthString(apiName: string, components: string[]): string {
    const apiKeyEx: string = apiName.toUpperCase();
    const apiKeyName = `API_${apiKeyEx}_APIKEY`;
    return getLocalizedString(
      "plugins.apiConnector.Notification.ApiKeyAuth",
      apiKeyName,
      components.toString()
    );
  }

  public static GetCustomAuthString(
    apiName: string,
    components: string[],
    languageType: string
  ): string {
    const fileName = getSampleFileName(apiName, languageType);
    return getLocalizedString(
      "plugins.apiConnector.Notification.CustomAuth",
      fileName,
      components.toString()
    );
  }

  public static GetGenAADAuthString(apiName: string, components: string[]): string {
    const apiKeyEx: string = apiName.toUpperCase();
    const apiKeyName = `API_${apiKeyEx}_CLIENTSECRET `;
    return getLocalizedString(
      "plugins.apiConnector.Notification.GenAADAuth",
      "<your-api-scope>",
      apiKeyName,
      components.toString()
    );
  }

  public static GetReuseAADAuthString(apiName: string): string {
    return getLocalizedString("plugins.apiConnector.Notification.ReuseAADAuth", "<your-api-scope>");
  }
}
