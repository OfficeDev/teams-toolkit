// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as crypto from "crypto";
import * as Handlebars from "handlebars";
import { URL } from "url";
import * as uuid from "uuid";
import { FailedToParseResourceIdError } from "../error/common";
import { getLocalizedString } from "./localizeUtils";
import { secretMasker } from "./secretmasker/masker";

const SECRET_REPLACE = "<REDACTED:secret>";
const USER_REPLACE = "<REDACTED:user>";

export interface MaskSecretOptions {
  threshold?: number;
  whiteList?: string[];
  replace?: string;
}

export function maskSecret(inputText?: string, option?: MaskSecretOptions): string {
  if (!inputText) return "";
  option = option || {};
  // const threshold = option.threshold || MIN_ENTROPY;
  // const whiteList = option.whiteList || WHITE_LIST;
  const replace = option.replace || SECRET_REPLACE;
  // mask by secret pattern
  let output = maskByPattern(inputText);
  // mask by .env.xxx.user
  output = maskSecretFromEnv(inputText, replace);
  // mask by entropy
  output = secretMasker.maskSecret(inputText, replace);
  return output;
}

function maskByPattern(command: string): string {
  const regexU = /(-u|--username|--user) (\S+)/;
  const regexP = /(-p|--password|--pwd|--secret|--credential) (\S+)/;
  let output = command.replace(regexU, `$1 ${USER_REPLACE}`);
  output = output.replace(regexP, `$1 ${SECRET_REPLACE}`);
  return output;
}

export function maskSecretFromEnv(stdout: string, replace = SECRET_REPLACE): string {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("SECRET_")) {
      const value = process.env[key];
      if (value) {
        stdout = stdout.replace(value, replace);
      }
    }
  }
  return stdout;
}

export function convertToAlphanumericOnly(appName: string): string {
  return appName.replace(/[^\da-zA-Z]/g, "");
}

Handlebars.registerHelper("contains", (value, array) => {
  array = array instanceof Array ? array : [array];
  return array.indexOf(value) > -1 ? this : "";
});
Handlebars.registerHelper("notContains", (value, array) => {
  array = array instanceof Array ? array : [array];
  return array.indexOf(value) == -1 ? this : "";
});
Handlebars.registerHelper("equals", (value, target) => {
  return value === target ? this : "";
});

export function getResourceGroupNameFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(/\/resourceGroups\/([^\/]*)\//i, resourceId);
  if (!result) {
    throw new FailedToParseResourceIdError("resource group name", resourceId);
  }
  return result;
}

export function parseFromResourceId(pattern: RegExp, resourceId: string): string {
  const result = resourceId.match(pattern);
  return result ? result[1].trim() : "";
}

export function getUuid(): string {
  return uuid.v4();
}

export function getHashedEnv(envName: string): string {
  return crypto.createHash("sha256").update(envName).digest("hex");
}

export function loadingOptionsPlaceholder(): string {
  return getLocalizedString("ui.select.LoadingOptionsPlaceholder");
}

export function loadingDefaultPlaceholder(): string {
  return getLocalizedString("ui.select.LoadingDefaultPlaceholder");
}

export function isValidHttpUrl(input: string): boolean {
  let url;
  try {
    url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (e) {
    return false;
  }
}
