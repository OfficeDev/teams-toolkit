// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as crypto from "crypto";
import * as Handlebars from "handlebars";
import { URL } from "url";
import * as uuid from "uuid";
import { FailedToParseResourceIdError } from "../error";
import { getLocalizedString } from "./localizeUtils";

const MIN_ENTROPY = 4;
const SECRET_REPLACE = "<REDACTED:secret>";
const USER_REPLACE = "<REDACTED:user>";

const WHITE_LIST = [
  "user-file-path",
  "publish-app,",
  "X-Correlation-ID",
  "innerError",
  "client-request-id",
];

function getProbMap(str: string) {
  const probMap = new Map<string, number>();
  for (const char of str) {
    probMap.set(char, (probMap.get(char) || 0) + 1);
  }
  for (const [char, freq] of probMap.entries()) {
    const prob = freq / str.length;
    probMap.set(char, prob);
  }
  return probMap;
}

// Measure the entropy of a string in bits per symbol.
function shannonEntropy(str: string, probMap: Map<string, number>) {
  let sum = 0;
  for (const char of str) {
    const prob = probMap.get(char) || 0;
    const delta = (prob * Math.log(prob)) / Math.log(2);
    sum += delta;
  }
  return -sum;
}

class Token {
  value: string;
  splitter: boolean;
  entropy?: number;
  constructor(value: string, splitter: boolean) {
    this.value = value;
    this.splitter = splitter;
  }
}

function tokenize(text: string): Token[] {
  const splitterString = " '`\n\t\r\",:{}";
  const splitterChars = new Set<string>();
  for (const char of splitterString) {
    splitterChars.add(char);
  }
  const tokens: Token[] = [];
  let currentToken = "";
  for (const char of text) {
    if (splitterChars.has(char)) {
      if (currentToken.length > 0) {
        tokens.push(new Token(currentToken, false));
        currentToken = "";
      }
      tokens.push(new Token(char, true));
    } else {
      currentToken += char;
    }
  }
  if (currentToken.length > 0) {
    tokens.push(new Token(currentToken, false));
  }
  return tokens;
}

function computeShannonEntropy(token: Token) {
  if (!token.splitter) {
    const probMap = getProbMap(token.value);
    token.entropy = shannonEntropy(token.value, probMap);
  }
}

export interface MaskSecretOptions {
  threshold?: number;
  whiteList?: string[];
  replace?: string;
}

export function maskSecret(
  inputText?: string,
  option = { threshold: MIN_ENTROPY, whiteList: WHITE_LIST, replace: SECRET_REPLACE }
): string {
  if (!inputText) return "";
  option = option || {};
  option.threshold = option.threshold || MIN_ENTROPY;
  option.whiteList = option.whiteList || WHITE_LIST;
  option.replace = option.replace || SECRET_REPLACE;
  // mask by secret pattern
  inputText = maskByPattern(inputText);
  // mask by .env.xxx.user
  inputText = maskSecretFromEnv(inputText, option.replace);
  // mask by entropy
  let output = "";
  const tokens = tokenize(inputText);
  tokens.forEach((token) => {
    computeShannonEntropy(token);
    if (
      option.whiteList?.includes(token.value) ||
      token.splitter ||
      (token.entropy || 0) <= option.threshold
    ) {
      output += token.value;
    } else {
      output += option.replace;
    }
  });
  // for (const token of tokens) {
  //   console.log(token);
  // }
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
