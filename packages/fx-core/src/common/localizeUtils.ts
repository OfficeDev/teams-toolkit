// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Locale } from "./globalVars";
import { getResourceFolder } from "../folder";
import * as path from "path";
import fs from "fs-extra";
import * as util from "util";

const LocaleStringMap = new Map<string, any>();

function getLocaleJson(locale?: string): any {
  locale = locale || "";
  const jsonInMap = LocaleStringMap.get(locale);
  if (jsonInMap) return jsonInMap;
  const nlsFileName = Locale ? `package.nls.${Locale}.json` : "package.nls.json";
  let nlsFilePath = path.join(getResourceFolder(), nlsFileName);
  if (!fs.pathExistsSync(nlsFilePath)) {
    // if nls file does not exist, just read the default one
    nlsFilePath = path.join(getResourceFolder(), "package.nls.json");
  }
  const json = fs.readJSONSync(nlsFilePath);
  if (json) {
    LocaleStringMap.set(locale, json);
  }
  return json;
}

export function getLocalizedString(key: string, ...params: any[]): string {
  const json = getLocaleJson(Locale);
  let value = json[key];
  if (value && params && params.length > 0) {
    value = util.format(value, ...params);
  }

  if (!value) {
    return getDefaultString(key, ...params);
  }
  return value || "";
}

export function getDefaultString(key: string, ...params: any[]): string {
  const json = getLocaleJson("");
  let value = json[key];
  if (value && params && params.length > 0) {
    value = util.format(value, ...params);
  }
  return value || "";
}
