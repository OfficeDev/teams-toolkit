// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { includes } from "lodash";
import Mustache from "mustache";
import { TEAMS_APP_SHORT_NAME_MAX_LENGTH } from "../constants";
import { AppDefinition } from "../interfaces/appDefinition";
import { ConfigurableTab } from "../interfaces/configurableTab";

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

export function needTabCode(appDefinition: AppDefinition): boolean {
  const isPersonalApp = !!appDefinition.staticTabs && appDefinition.staticTabs.length > 0;
  const isGroupApp =
    !!appDefinition.configurableTabs &&
    appDefinition.configurableTabs.length > 0 &&
    groupAppConfigured(appDefinition.configurableTabs[0]);

  return isPersonalApp || isGroupApp;
}

export function needBotCode(appDefinition: AppDefinition): boolean {
  const isBot = !!appDefinition.bots && appDefinition.bots.length > 0;
  const isMessageExtension =
    !!appDefinition.messagingExtensions && appDefinition.messagingExtensions.length > 0;
  return isBot || isMessageExtension;
}

export function hasMeetingExtension(appDefinition: AppDefinition): boolean {
  return (
    !!appDefinition.configurableTabs &&
    appDefinition.configurableTabs.length > 0 &&
    meetingExtensionConfigured(appDefinition.configurableTabs[0])
  );
}

const groupAppConfigured = (tab?: ConfigurableTab) => {
  const validGroupAppContext =
    includes(tab?.context, MeetingsContext.ChannelTab) ||
    includes(tab?.context, MeetingsContext.PrivateChatTab);
  const validGroupAppScope =
    includes(tab?.scopes, CommandScope.GroupChat) || includes(tab?.scopes, CommandScope.Team);

  return validGroupAppScope && validGroupAppContext;
};

const meetingExtensionConfigured = (tab?: ConfigurableTab) => {
  const validMeetingContext =
    includes(tab?.context, MeetingsContext.SidePanel) ||
    includes(tab?.context, MeetingsContext.DetailsTab) ||
    includes(tab?.context, MeetingsContext.ChatTab);
  const validMeetingScope = includes(tab?.scopes, CommandScope.GroupChat);

  return validMeetingScope && validMeetingContext;
};

export enum CommandScope {
  Team = "team",
  Personal = "personal",
  GroupChat = "groupchat",
}

export enum MeetingsContext {
  ChannelTab = "channelTab",
  PrivateChatTab = "privateChatTab",
  SidePanel = "meetingSidePanel",
  ShareToStage = "meetingStage",
  DetailsTab = "meetingDetailsTab",
  ChatTab = "meetingChatTab",
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
