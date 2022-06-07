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

/**
 * Convert from TeamsAppManifest to AppDefinition
 * Localization file is not included
 * @param appManifest
 * @returns
 */
export function convertToAppDefinition(appManifest: TeamsAppManifest): AppDefinition {
  const appDefinition: AppDefinition = {
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

  appDefinition.staticTabs = appManifest.staticTabs?.map((x) => {
    return {
      objectId: x.objectId,
      entityId: x.entityId,
      name: x.name ?? "",
      contentUrl: x.contentUrl ?? "",
      websiteUrl: x.websiteUrl ?? "",
      scopes: x.scopes,
      context: x.context ?? [],
    };
  });
  appDefinition.configurableTabs = appManifest.configurableTabs?.map((x) => {
    return {
      objectId: x.objectId,
      configurationUrl: x.configurationUrl,
      canUpdateConfiguration: x.canUpdateConfiguration ?? false,
      scopes: x.scopes,
      context: x.context ?? [],
      sharePointPreviewImage: x.sharePointPreviewImage ?? "",
      supportedSharePointHosts: x.supportedSharePointHosts ?? [],
    };
  });

  appDefinition.bots = convertToAppDefinitionBots(appManifest);
  appDefinition.messagingExtensions = convertToAppDefinitionMessagingExtensions(appManifest);

  appDefinition.connectors = appManifest.connectors?.map((x) => {
    return {
      connectorId: x.connectorId,
      configurationUrl: x.configurationUrl ?? "",
      name: "",
      scopes: x.scopes,
    };
  });
  appDefinition.graphConnector = appManifest.graphConnector;
  appDefinition.devicePermissions = appManifest.devicePermissions;

  if (appManifest.webApplicationInfo) {
    appDefinition.webApplicationInfoId = appManifest.webApplicationInfo.id;
    appDefinition.webApplicationInfoResource = appManifest.webApplicationInfo.resource;
  }

  appDefinition.activities = {
    activityTypes: appManifest.activities?.activityTypes ?? [],
  };

  if (appManifest.icons.color) {
    appDefinition.colorIcon = appManifest.icons.color;
  }

  if (appManifest.icons.outline) {
    appDefinition.outlineIcon = appManifest.icons.outline;
  }

  return appDefinition;
}

export function convertToAppDefinitionBots(appManifest: TeamsAppManifest): Bot[] {
  const bots: Bot[] = [];
  if (appManifest.bots) {
    appManifest.bots.forEach((manBot: IBot) => {
      const teamCommands: BotCommand[] = [];
      const groupCommands: BotCommand[] = [];
      const personalCommands: BotCommand[] = [];

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

      const bot: Bot = {
        botId: manBot.botId,
        isNotificationOnly: manBot.isNotificationOnly ?? false,
        supportsFiles: manBot.supportsFiles ?? false,
        supportsCalling: manBot.supportsCalling ?? false,
        supportsVideo: manBot.supportsVideo ?? false,
        scopes: manBot.scopes,
        teamCommands: teamCommands,
        groupChatCommands: groupCommands,
        personalCommands: personalCommands,
        needsChannelSelector: false,
      };

      bots.push(bot);
    });
  }
  return bots;
}

export function convertToAppDefinitionMessagingExtensions(
  appManifest: TeamsAppManifest
): MessagingExtension[] {
  const messagingExtensions: MessagingExtension[] = [];

  if (appManifest.composeExtensions) {
    appManifest.composeExtensions.forEach((ext: IComposeExtension) => {
      const me: MessagingExtension = {
        botId: ext.botId,
        canUpdateConfiguration: true,
        commands: ext.commands.map((x) => {
          return {
            id: x.id,
            type: x.type ?? "query",
            title: x.title,
            description: x.description ?? "",
            initialRun: x.initialRun ?? false,
            fetchTask: x.fetchTask ?? false,
            context: x.context ?? ["compose", "commandBox"],
            parameters:
              x.parameters?.map((p) => {
                return {
                  name: p.name,
                  title: p.title,
                  description: p.description ?? "",
                  inputType: p.inputType ?? "text",
                  choices: p.choices ?? [],
                };
              }) ?? [],
            taskInfo: {
              title: x.taskInfo?.title ?? "",
              width: x.taskInfo?.width ?? "",
              height: x.taskInfo?.height ?? "",
              url: x.taskInfo?.url ?? "",
            },
          };
        }),
        messageHandlers:
          ext.messageHandlers?.map((h) => {
            return {
              type: h.type,
              value: {
                domains: h.value.domains ?? [],
              },
            };
          }) ?? [],
      };

      messagingExtensions.push(me);
    });
  }

  return messagingExtensions;
}
