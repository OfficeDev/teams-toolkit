// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { Inputs } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { LanguageType, FileType } from "./constants";
import { ErrorMessage } from "./errors";
import { ResultFactory } from "./result";
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
