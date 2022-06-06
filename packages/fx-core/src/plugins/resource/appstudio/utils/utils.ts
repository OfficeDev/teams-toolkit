// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TEAMS_APP_SHORT_NAME_MAX_LENGTH } from "../constants";
import {
  TeamsAppManifest,
  IComposeExtension,
  IBot,
  ICommand,
  ICommandList,
} from "@microsoft/teamsfx-api";
import {
  IAppDefinition,
  IAppDefinitionBot,
  IMessagingExtension,
  ITeamCommand,
  IGroupChatCommand,
  IPersonalCommand,
} from "../interfaces/IAppDefinition";
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

/**
 * Convert from TeamsAppManifest to AppDefinition
 * Localization file is not included
 * @param appManifest
 * @returns
 */
export function convertToAppDefinition(appManifest: TeamsAppManifest): IAppDefinition {
  const appDefinition: IAppDefinition = {
    appName: appManifest.name.short,
    validDomains: appManifest.validDomains,
  };

  appDefinition.showLoadingIndicator = appManifest.showLoadingIndicator;
  appDefinition.isFullScreen = appManifest.isFullScreen;
  appDefinition.appId = appManifest.id;

  appDefinition.appName = appManifest.name.short;
  appDefinition.shortName = appManifest.name.short;
  appDefinition.longName = appManifest.name.full;
  appDefinition.manifestVersion = appManifest.manifestVersion;
  appDefinition.version = appManifest.version;

  appDefinition.packageName = appManifest.packageName;
  appDefinition.accentColor = appManifest.accentColor;

  appDefinition.developerName = appManifest.developer.name;
  appDefinition.mpnId = appManifest.developer.mpnId;
  appDefinition.websiteUrl = appManifest.developer.websiteUrl;
  appDefinition.privacyUrl = appManifest.developer.privacyUrl;
  appDefinition.termsOfUseUrl = appManifest.developer.termsOfUseUrl;

  appDefinition.shortDescription = appManifest.description.short;
  appDefinition.longDescription = appManifest.description.full;

  appDefinition.staticTabs = appManifest.staticTabs;
  appDefinition.configurableTabs = appManifest.configurableTabs;

  appDefinition.bots = convertToAppDefinitionBots(appManifest);
  appDefinition.messagingExtensions = convertToAppDefinitionMessagingExtensions(appManifest);

  appDefinition.connectors = appManifest.connectors;
  appDefinition.graphConnector = appManifest.graphConnector;
  appDefinition.devicePermissions = appManifest.devicePermissions;

  if (appManifest.webApplicationInfo) {
    appDefinition.webApplicationInfoId = appManifest.webApplicationInfo.id;
    appDefinition.webApplicationInfoResource = appManifest.webApplicationInfo.resource;
  }

  appDefinition.activities = appManifest.activities;

  if (appManifest.icons.color) {
    appDefinition.colorIcon = appManifest.icons.color;
  }

  if (appManifest.icons.outline) {
    appDefinition.outlineIcon = appManifest.icons.outline;
  }

  return appDefinition;
}

export function convertToAppDefinitionBots(appManifest: TeamsAppManifest): IAppDefinitionBot[] {
  const bots: IAppDefinitionBot[] = [];
  if (appManifest.bots) {
    appManifest.bots.forEach((manBot: IBot) => {
      const teamCommands: ITeamCommand[] = [];
      const groupCommands: IGroupChatCommand[] = [];
      const personalCommands: IPersonalCommand[] = [];

      manBot?.commandLists?.forEach((list: ICommandList) => {
        list.commands.forEach((command: ICommand) => {
          teamCommands.push({
            title: command.title,
            description: command.description,
          });

          groupCommands.push({
            title: command.title,
            description: command.description,
          });

          personalCommands.push({
            title: command.title,
            description: command.description,
          });
        });
      });

      const bot: IAppDefinitionBot = {
        botId: manBot.botId,
        isNotificationOnly: manBot.isNotificationOnly ?? false,
        supportsFiles: manBot.supportsFiles ?? false,
        supportsCalling: manBot.supportsCalling,
        supportsVideo: manBot.supportsVideo,
        scopes: manBot.scopes,
        teamCommands: teamCommands,
        groupChatCommands: groupCommands,
        personalCommands: personalCommands,
      };

      bots.push(bot);
    });
  }
  return bots;
}

export function convertToAppDefinitionMessagingExtensions(
  appManifest: TeamsAppManifest
): IMessagingExtension[] {
  const messagingExtensions: IMessagingExtension[] = [];

  if (appManifest.composeExtensions) {
    appManifest.composeExtensions.forEach((ext: IComposeExtension) => {
      const me: IMessagingExtension = {
        botId: ext.botId,
        canUpdateConfiguration: true,
        commands: ext.commands,
        messageHandlers: ext.messageHandlers ?? [],
      };

      messagingExtensions.push(me);
    });
  }

  return messagingExtensions;
}
