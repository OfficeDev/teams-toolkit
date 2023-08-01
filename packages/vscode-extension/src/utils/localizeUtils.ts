// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as fs from "fs-extra";
import * as globalVariables from "../globalVariables";

let loadedCollection: Record<string, string> | undefined = undefined;
let defaultCollection: Record<string, string> | undefined = undefined;
let askedForCollection: Record<string, string> = {};
let loadedLocale: string;

export function localize(key: string, defValue?: string) {
  return getString(key, defValue);
}

export function getDefaultString(key: string, defValue?: string) {
  loadDefaultStrings();
  return getLocalizedString(key, true, defValue);
}

function getString(key: string, defValue?: string) {
  if (shouldReloadLocale()) {
    loadLocalizedStrings();
  }
  return getLocalizedString(key, false, defValue);
}

export function _resetCollections(): void {
  loadedLocale = "";
  loadedCollection = undefined;
  askedForCollection = {};
}

export function _getAskedForCollection(): Record<string, string> {
  return askedForCollection;
}

function shouldReloadLocale(): boolean {
  return !loadedCollection || parseLocale() !== loadedLocale;
}

declare let navigator: { language: string } | undefined;

export function parseLocale(): string {
  try {
    if (navigator?.language) {
      return navigator.language.toLowerCase();
    }
  } catch {}
  const vscodeConfigString = process.env.VSCODE_NLS_CONFIG;
  return vscodeConfigString
    ? (JSON.parse(vscodeConfigString) as Record<string, string>).locale
    : "en-us";
}

function getLocalizedString(key: string, isDefault: boolean, defValue?: string): string {
  let collection = defaultCollection;

  if (!isDefault && loadedCollection && loadedCollection.hasOwnProperty(key)) {
    collection = loadedCollection;
  }
  if (collection === undefined) {
    throw new Error(`Localizations haven't been loaded yet for key: ${key}`);
  }
  let result = collection[key];
  if (!result && defValue) {
    result = defValue;
  }
  askedForCollection[key] = result;

  return result;
}

/**
 * Load localized strings according to current locale. By default, load package.nls.json if target locale doesn't exist.
 */
export function loadLocalizedStrings(): void {
  loadedLocale = parseLocale();

  const nlsFile = path.join(
    globalVariables.context ? globalVariables.context.extensionPath : "",
    `package.nls.${loadedLocale}.json`
  );
  if (fs.pathExistsSync(nlsFile)) {
    loadedCollection = fs.readJsonSync(nlsFile) as Record<string, string> | undefined;
  } else {
    loadedCollection = {};
  }

  loadDefaultStrings();
}

function loadDefaultStrings(): void {
  if (!defaultCollection) {
    const defaultNlsFile = path.join(
      globalVariables.context ? globalVariables.context.extensionPath : "",
      "package.nls.json"
    );
    if (fs.pathExistsSync(defaultNlsFile)) {
      defaultCollection = fs.readJsonSync(defaultNlsFile) as Record<string, string> | undefined;
    } else {
      defaultCollection = {};
    }
  }
}
