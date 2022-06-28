// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { Inputs, FxError, SystemError } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { LanguageType, FileType } from "./constants";
import { ErrorMessage } from "./errors";
import { ResultFactory } from "./result";
import { getLocalizedString } from "../../../common/localizeUtils";
import path from "path";
import { ApiConnectorConfiguration, AADAuthConfig } from "./config";
import { Telemetry, TelemetryUtils } from "./telemetry";

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

export function sendErrorTelemetry(thrownErr: FxError, stage: string) {
  const errorCode = thrownErr.source + "." + thrownErr.name;
  const errorType = thrownErr instanceof SystemError ? Telemetry.systemError : Telemetry.userError;
  const errorMessage = thrownErr.message;
  TelemetryUtils.sendErrorEvent(stage, errorCode, errorType, errorMessage);
  return thrownErr;
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
    const apiName: string = config.APIName;
    const retMsg: string = Notification.GetBasicString(apiName, config.ComponentType, languageType);
    return retMsg;
  }
}
