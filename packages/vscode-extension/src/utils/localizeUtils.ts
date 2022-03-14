// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from "path";
import * as fs from "fs-extra";

const EXTENSION_ROOT_DIR = path.join(__dirname, "..", "..");
let loadedCollection: Record<string, string> | undefined = undefined;
let defaultCollection: Record<string, string> | undefined = undefined;
let askedForCollection: Record<string, string> = {};
let loadedLocale: string;

export function localize(key: string, defValue?: string) {
  return getString(key, defValue);
}

function getString(key: string, defValue?: string) {
  if (shouldReloadLocale()) {
    loadLocalizedStrings();
  }
  return getLocalizedString(key, defValue);
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

function parseLocale(): string {
  try {
    if (navigator?.language) {
      return navigator.language.toLowerCase();
    }
  } catch {}
  const vscodeConfigString = process.env.VSCODE_NLS_CONFIG;
  return vscodeConfigString ? JSON.parse(vscodeConfigString).locale : "en-us";
}

function getLocalizedString(key: string, defValue?: string): string {
  let collection = defaultCollection;

  if (loadedCollection && loadedCollection.hasOwnProperty(key)) {
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

  const nlsFile = path.join(EXTENSION_ROOT_DIR, "..", `package.nls.${loadedLocale}.json`);
  if (fs.pathExistsSync(nlsFile)) {
    loadedCollection = fs.readJsonSync(nlsFile);
  } else {
    loadedCollection = {};
  }

  if (!defaultCollection) {
    const defaultNlsFile = path.join(EXTENSION_ROOT_DIR, "..", "package.nls.json");
    if (fs.pathExistsSync(defaultNlsFile)) {
      defaultCollection = fs.readJsonSync(defaultNlsFile);
    } else {
      defaultCollection = {};
    }
  }
}
