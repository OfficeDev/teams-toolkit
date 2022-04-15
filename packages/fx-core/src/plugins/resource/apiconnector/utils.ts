// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { Inputs } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { LanguageType, FileType, Constants, AuthType } from "./constants";
import { ErrorMessage } from "./errors";
import { ResultFactory } from "./result";
import { getLocalizedString } from "../../../common/localizeUtils";
import path from "path";
import { ApiConnectorConfiguration, AADAuthConfig } from "./config";

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

export function concatLines(line: string[], interval = " "): string {
  return line.reduce((prev, cur) => {
    return prev + interval + cur;
  });
}

export class Notification {
  public static readonly READ_MORE = getLocalizedString("core.Notification.ReadMore");
  public static readonly READ_MORE_URL = "https://aka.ms/teamsfx-connect-api";

  public static GetBasicString(
    apiName: string,
    components: string[],
    languageType: string
  ): string {
    const fileName = getSampleFileName(apiName, languageType);
    const generatedFiles = concatLines(
      components.map((item) => path.join(item, fileName)),
      " and "
    );
    return getLocalizedString("plugins.apiConnector.Notification.GenerateFiles", generatedFiles);
  }

  public static GetBasicAuthString(apiName: string, components: string[]): string {
    const apiNameEx = apiName.toUpperCase();
    const envName = `API_${apiNameEx}_PASSWORD`;
    return getLocalizedString(
      "plugins.apiConnector.Notification.BasicAuth",
      envName,
      concatLines(components, " and ")
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
      concatLines(components, " and ")
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
      concatLines(components, " and ")
    );
  }

  public static GetGenAADAuthString(apiName: string, components: string[]): string {
    const apiNameUpperCase: string = apiName.toUpperCase();
    const envName = `API_${apiNameUpperCase}_CLIENTSECRET `;
    const envFiles = concatLines(
      components.map((item) => path.join(item, Constants.envFileName)),
      " and "
    );
    return getLocalizedString(
      "plugins.apiConnector.Notification.GenAADAuth",
      "<your-api-scope>",
      envName,
      envFiles
    );
  }

  public static GetReuseAADAuthString(apiName: string): string {
    return getLocalizedString("plugins.apiConnector.Notification.ReuseAADAuth", "<your-api-scope>");
  }

  public static GetNpmInstallString(): string {
    return getLocalizedString("plugins.apiConnector.Notification.NpmInstall");
  }

  public static GetLinkNotification(): string {
    return getLocalizedString(
      "plugins.apiConnector.Notification.LinkNotification",
      Notification.READ_MORE_URL
    );
  }

  public static getNotificationMsg(
    config: ApiConnectorConfiguration,
    languageType: string
  ): string {
    const authType: AuthType = config.AuthConfig.AuthType;
    const apiName: string = config.APIName;
    let retMsg: string = Notification.GetBasicString(apiName, config.ComponentType, languageType);
    switch (authType) {
      case AuthType.BASIC: {
        retMsg = concatLines([
          retMsg,
          Notification.GetBasicAuthString(apiName, config.ComponentType),
        ]);
        break;
      }
      case AuthType.APIKEY: {
        retMsg = concatLines([
          retMsg,
          Notification.GetApiKeyAuthString(apiName, config.ComponentType),
        ]);
        break;
      }
      case AuthType.AAD: {
        if ((config.AuthConfig as AADAuthConfig).ReuseTeamsApp) {
          retMsg = concatLines([retMsg, Notification.GetReuseAADAuthString(apiName)]);
        } else {
          retMsg = concatLines([
            retMsg,
            Notification.GetGenAADAuthString(apiName, config.ComponentType),
          ]);
        }
        break;
      }
      case AuthType.CERT: {
        retMsg = concatLines([
          retMsg,
          Notification.GetCertAuthString(apiName, config.ComponentType),
        ]);
        break;
      }
      case AuthType.CUSTOM: {
        retMsg = Notification.GetCustomAuthString(apiName, config.ComponentType, languageType);
        break;
      }
    }
    retMsg = concatLines([retMsg, Notification.GetNpmInstallString()]);
    return retMsg;
  }
}
