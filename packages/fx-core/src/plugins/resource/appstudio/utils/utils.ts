// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import Mustache from "mustache";
import { TEAMS_APP_SHORT_NAME_MAX_LENGTH } from "../constants";

export function getCustomizedKeys(prefix: string, manifest: any): string[] {
  let keys: string[] = [];
  for (const key in manifest) {
    if (manifest.hasOwnProperty(key)) {
      const value = manifest[key];
      if (typeof value === "object") {
        if (Array.isArray(value)) {
          value.map((item, index) => {
            keys = keys.concat(getCustomizedKeys(`${prefix}.${key}[${index}]`, item));
          });
        } else {
          keys = keys.concat(getCustomizedKeys(`${prefix}.${key}`, value));
        }
      } else if (typeof value === "string" && value.startsWith("{{config.manifest")) {
        keys.push(`${prefix}.${key}`);
      }
    }
  }
  return keys;
}

export function getLocalAppName(appName: string): string {
  const suffix = "-local-debug";
  if (suffix.length + appName.length <= TEAMS_APP_SHORT_NAME_MAX_LENGTH) {
    appName = appName + suffix;
  }
  return appName;
}

export function renderTemplate(manifestString: string, view: any): string {
  // Unesacped HTML
  Mustache.escape = (value) => value;
  manifestString = Mustache.render(manifestString, view);
  return manifestString;
}

export class RetryHandler {
  public static RETRIES = 6;
  public static async Retry<T>(fn: () => Promise<T>): Promise<T | undefined> {
    let retries = this.RETRIES;
    let response;
    while (retries > 0) {
      retries = retries - 1;
      try {
        response = await fn();
        return response;
      } catch (e: any) {
        // Directly throw 404 error, keep trying for other status code e.g. 503 400
        if (retries <= 0 || e.response?.status == 404 || e.response?.status == 409) {
          throw e;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }
  }
}
