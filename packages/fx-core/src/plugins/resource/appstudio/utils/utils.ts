// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import Mustache from "mustache";
import { TEAMS_APP_SHORT_NAME_MAX_LENGTH } from "../constants";
import {
  TeamsAppManifest,
  IComposeExtension,
  IBot,
  ICommand,
  ICommandList,
} from "@microsoft/teamsfx-api";
import { BotCommand } from "../interfaces/botCommand";
import { AppDefinition } from "../interfaces/appDefinition";
import { Bot } from "../interfaces/bot";
import { MessagingExtension } from "../interfaces/messagingExtension";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";
import { AppStudioResultFactory } from "../results";

export function replaceConfigValue(config: string, id: string, value: string): string {
  if (config && id && value) {
    const idTag = `{${id}}`;
    while (config.includes(idTag)) {
      config = config.replace(idTag, value);
    }
  }
  return config;
}

/**
 *
 * @throws Error - when placeholder doesn't have corresponding value
 */
export function checkAndConfig(config: string, id: string, value: string | undefined): string {
  const idTag = `{${id}}`;
  if (value) {
    return replaceConfigValue(config, id, value);
  } else {
    if (config.includes(idTag)) {
      throw AppStudioResultFactory.SystemError("RequiredDataMissing", [
        getDefaultString("plugins.appstudio.dataRequired", idTag),
        getLocalizedString("plugins.appstudio.dataRequired", idTag),
      ]);
    } else {
      return config;
    }
  }
}

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
        if (retries <= 0 || e.response?.status == 404) {
          throw e;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }
  }
}
