/* eslint-disable @typescript-eslint/no-namespace */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  IBotRegistration,
  IAADApplication,
  IAADPassword,
  IAppDefinition,
  IAppDefinitionBot,
  IGroupChatCommand,
  IPersonalCommand,
  ITeamCommand,
  IMessagingExtension,
} from "./interface";
import {
  TeamsAppManifest,
  LogProvider,
  ICommand,
  ICommandList,
  IBot,
  IComposeExtension,
  AzureSolutionSettings,
  ProjectSettings,
} from "@microsoft/teamsfx-api";
import {
  BotOptionItem,
  HostTypeOptionAzure,
  MessageExtensionItem,
  TabOptionItem,
} from "../question";
import {
  TEAMS_APP_MANIFEST_TEMPLATE,
  CONFIGURABLE_TABS_TPL,
  STATIC_TABS_TPL,
  BOTS_TPL,
  COMPOSE_EXTENSIONS_TPL,
  TEAMS_APP_SHORT_NAME_MAX_LENGTH,
} from "../constants";
import axios, { AxiosInstance } from "axios";

export namespace AppStudio {
  type Icon = {
    type: "color" | "outline" | "sharePointPreviewImage";
    name: "color" | "outline" | "sharePointPreviewImage";
    base64String: string;
  };

  const baseUrl = "https://dev.teams.microsoft.com";

  // Creates a new axios instance to call app studio to prevent setting the accessToken
  // on global instance.
  function createRequesterWithToken(appStudioToken: string): AxiosInstance {
    const instance = axios.create({
      baseURL: baseUrl,
    });
    instance.defaults.headers.common["Authorization"] = `Bearer ${appStudioToken}`;
    return instance;
  }

  // Creates an app registration in app studio with the given configuration and returns the Teams app id.
  export async function createApp(
    appDefinition: IAppDefinition,
    appStudioToken: string,
    logProvider?: LogProvider,
    colorIconContent?: string, // base64 encoded
    outlineIconContent?: string // base64 encoded
  ): Promise<IAppDefinition | undefined> {
    if (appDefinition && appStudioToken) {
      try {
        const requester = createRequesterWithToken(appStudioToken);
        const appDef = {
          ...appDefinition,
        };
        // /api/appdefinitions/import accepts icons as Base64-encoded strings.
        if (colorIconContent) {
          appDef.colorIcon = colorIconContent;
        }
        if (outlineIconContent) {
          appDef.outlineIcon = outlineIconContent;
        }
        const response = await requester.post(`/api/appdefinitions/import`, appDef);
        if (response && response.data) {
          const app = <IAppDefinition>response.data;
          await logProvider?.debug(`recieved data from app studio ${JSON.stringify(app)}`);

          if (app) {
            return app;
          }
        }
      } catch (e) {
        if (e instanceof Error) {
          await logProvider?.warning(`failed to create app due to ${e.name}: ${e.message}`);
        }
        return undefined;
      }
    }

    await logProvider?.warning(`invalid appDefinition or appStudioToken`);
    return undefined;
  }

  async function uploadIcon(
    teamsAppId: string,
    appStudioToken: string,
    colorIconContent: string,
    outlineIconContent: string,
    requester: AxiosInstance,
    logProvider?: LogProvider
  ): Promise<{ colorIconUrl: string; outlineIconUrl: string }> {
    await logProvider?.info(`uploading icon for teams ${teamsAppId}`);
    if (teamsAppId && appStudioToken) {
      try {
        const colorIcon: Icon = {
          name: "color",
          type: "color",
          base64String: colorIconContent,
        };
        const outlineIcon: Icon = {
          name: "outline",
          type: "outline",
          base64String: outlineIconContent,
        };
        const colorIconResult = requester.post(
          `/api/appdefinitions/${teamsAppId}/image`,
          colorIcon
        );
        const outlineIconResult = requester.post(
          `/api/appdefinitions/${teamsAppId}/image`,
          outlineIcon
        );
        const results = await Promise.all([colorIconResult, outlineIconResult]);
        await logProvider?.info(`successfully uploaded two icons`);
        return { colorIconUrl: results[0].data, outlineIconUrl: results[1].data };
      } catch (e) {
        if (e instanceof Error) {
          await logProvider?.warning(`failed to upload icon due to ${e.name}: ${e.message}`);
        }
        throw e;
      }
    }
    throw new Error(`teamsAppId or appStudioToken is invalid`);
  }

  async function getApp(
    teamsAppId: string,
    appStudioToken: string,
    logProvider?: LogProvider
  ): Promise<IAppDefinition> {
    const requester = createRequesterWithToken(appStudioToken);
    try {
      const response = await requester.get(`/api/appdefinitions/${teamsAppId}`);
      if (response && response.data) {
        const app = <IAppDefinition>response.data;
        if (app && app.teamsAppId && app.teamsAppId === teamsAppId) {
          return app;
        } else {
          await logProvider?.error(
            `teamsAppId mismatch. Input: ${teamsAppId}. Got: ${app.teamsAppId}`
          );
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        await logProvider?.warning(`failed to update app due to ${e.name}: ${e.message}`);
      }
      throw new Error(`failed to update app due to ${e.name}: ${e.message}`);
    }
    throw new Error(`Cannot get the app definition with app ID ${teamsAppId}`);
  }

  // Updates an existing app if it exists with the configuration given.  Returns whether or not it was successful.
  export async function updateApp(
    teamsAppId: string,
    appDefinition: IAppDefinition,
    appStudioToken: string,
    logProvider?: LogProvider,
    colorIconContent?: string,
    outlineIconContent?: string
  ): Promise<IAppDefinition> {
    if (appDefinition && appStudioToken) {
      try {
        const requester = createRequesterWithToken(appStudioToken);

        // Get userlist from existing app
        const existingAppDefinition = await getApp(teamsAppId, appStudioToken, logProvider);
        const userlist = existingAppDefinition.userList;
        appDefinition.userList = userlist;

        let result: { colorIconUrl: string; outlineIconUrl: string } | undefined;
        if (colorIconContent && outlineIconContent) {
          result = await uploadIcon(
            teamsAppId,
            appStudioToken,
            colorIconContent,
            outlineIconContent,
            requester,
            logProvider
          );
          if (!result) {
            await logProvider?.error(`failed to upload color icon for: ${teamsAppId}`);
            throw new Error(`failed to upload icons for ${teamsAppId}`);
          }
          appDefinition.colorIcon = result.colorIconUrl;
          appDefinition.outlineIcon = result.outlineIconUrl;
        }
        const response = await requester.post(
          `/api/appdefinitions/${teamsAppId}/override`,
          appDefinition
        );
        if (response && response.data) {
          const app = <IAppDefinition>response.data;

          if (app && app.teamsAppId && app.teamsAppId === teamsAppId) {
            return app;
          } else {
            await logProvider?.error(
              `teamsAppId mismatch. Input: ${teamsAppId}. Got: ${app.teamsAppId}`
            );
          }
        }
      } catch (e) {
        if (e instanceof Error) {
          await logProvider?.warning(`failed to update app due to ${e.name}: ${e.message}`);
        }
        throw new Error(`failed to update app due to ${e.name}: ${e.message}`);
      }
    }

    throw new Error(`invalid appDefinition[${appDefinition}] or appStudioToken[${appStudioToken}]`);
  }

  export async function createBotRegistration(
    registration: IBotRegistration,
    appStudioToken: string
  ): Promise<boolean> {
    if (registration && appStudioToken) {
      try {
        const requester = createRequesterWithToken(appStudioToken);
        const response = await requester.post(`/api/botframework`, registration);
        if (response && response.data) {
          return true;
        }
      } catch {
        return false;
      }
    }

    return false;
  }

  export async function updateBotRegistration(
    registration: IBotRegistration,
    appStudioToken: string
  ): Promise<boolean> {
    if (registration && appStudioToken) {
      try {
        const requester = createRequesterWithToken(appStudioToken);
        const response = await requester.post(
          `/api/botframework/${registration.botId}`,
          registration
        );
        if (response && response.data) {
          return true;
        }
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  export async function createAADApp(
    aadApp: IAADApplication,
    appStudioToken: string
  ): Promise<IAADApplication | undefined> {
    if (aadApp && appStudioToken) {
      try {
        const requester = createRequesterWithToken(appStudioToken);
        const response = await requester.post(`${baseUrl}/api/aadapp`, aadApp);
        if (response && response.data) {
          const app = <IAADApplication>response.data;

          if (app) {
            return app;
          }
        }
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  export async function createAADAppPassword(
    aadAppObjectId: string,
    appStudioToken: string
  ): Promise<IAADPassword | undefined> {
    if (aadAppObjectId && appStudioToken) {
      try {
        const requester = createRequesterWithToken(appStudioToken);
        const response = await requester.post(`/api/aadapp/${aadAppObjectId}/passwords`);
        if (response && response.data) {
          const app = <IAADPassword>response.data;

          if (app) {
            return app;
          }
        }
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  /**
   * ask app common questions to generate app manifest
   */
  export async function createManifest(
    settings: ProjectSettings
  ): Promise<TeamsAppManifest | undefined> {
    const solutionSettings: AzureSolutionSettings =
      settings.solutionSettings as AzureSolutionSettings;
    if (
      !solutionSettings.capabilities ||
      (!solutionSettings.capabilities.includes(BotOptionItem.id) &&
        !solutionSettings.capabilities.includes(MessageExtensionItem.id) &&
        !solutionSettings.capabilities.includes(TabOptionItem.id))
    ) {
      throw new Error(`Invalid capability: ${solutionSettings.capabilities}`);
    }
    if (
      HostTypeOptionAzure.id === solutionSettings.hostType ||
      solutionSettings.capabilities.includes(BotOptionItem.id) ||
      solutionSettings.capabilities.includes(MessageExtensionItem.id)
    ) {
      let manifestString = TEAMS_APP_MANIFEST_TEMPLATE;
      manifestString = replaceConfigValue(manifestString, "appName", settings.appName);
      manifestString = replaceConfigValue(manifestString, "version", "1.0.0");
      const manifest: TeamsAppManifest = JSON.parse(manifestString);
      if (solutionSettings.capabilities.includes(TabOptionItem.id)) {
        manifest.staticTabs = STATIC_TABS_TPL;
        manifest.configurableTabs = CONFIGURABLE_TABS_TPL;
      }
      if (solutionSettings.capabilities.includes(BotOptionItem.id)) {
        manifest.bots = BOTS_TPL;
      }
      if (solutionSettings.capabilities.includes(MessageExtensionItem.id)) {
        manifest.composeExtensions = COMPOSE_EXTENSIONS_TPL;
      }
      return manifest;
    }

    return undefined;
  }

  /**
   * Find and replace all id values in the manifest and replace
   * with another value.
   * @param config config file content
   * @param id Id to find and replace with a value
   * @param value Value to put in place of the id
   */
  function replaceConfigValue(config: string, id: string, value: string): string {
    if (config && id && value) {
      const idTag = `{${id}}`;
      while (config.includes(idTag)) {
        config = config.replace(idTag, value);
      }
    }

    return config;
  }

  export function getDevAppDefinition(
    manifest: string,
    appId: string,
    domains: string[],
    webApplicationInfoResource: string,
    ignoreIcon: boolean,
    tabEndpoint?: string,
    appName?: string,
    version?: string,
    botId?: string,
    appNameSuffix?: string
  ): [IAppDefinition, TeamsAppManifest] {
    if (appName) {
      manifest = replaceConfigValue(manifest, "appName", appName);
    }
    if (version) {
      manifest = replaceConfigValue(manifest, "version", version);
    }
    if (botId) {
      manifest = replaceConfigValue(manifest, "botId", botId);
    }
    manifest = replaceConfigValue(
      manifest,
      "baseUrl",
      tabEndpoint ? tabEndpoint : "https://localhost:3000"
    );
    manifest = replaceConfigValue(manifest, "appClientId", appId);
    manifest = replaceConfigValue(manifest, "appid", appId);
    manifest = replaceConfigValue(
      manifest,
      "webApplicationInfoResource",
      webApplicationInfoResource
    );

    const updatedManifest = JSON.parse(manifest) as TeamsAppManifest;

    for (const domain of domains) {
      updatedManifest.validDomains?.push(domain);
    }

    const appDefinition = convertToAppDefinition(updatedManifest, ignoreIcon);
    // For local debug teams app, the app name will have a suffix to differentiate from remote teams app
    // if the resulting short name length doesn't exceeds limit.
    if (appNameSuffix) {
      const shortNameLength = appNameSuffix.length + (appDefinition.shortName?.length ?? 0);
      if (shortNameLength <= TEAMS_APP_SHORT_NAME_MAX_LENGTH) {
        appDefinition.shortName = appDefinition.shortName + appNameSuffix;
        appDefinition.appName = appDefinition.shortName;
      }
    }

    return [appDefinition, updatedManifest];
  }

  export function convertToAppDefinition(
    appManifest: TeamsAppManifest,
    ignoreIcon: boolean
  ): IAppDefinition {
    const appDefinition: IAppDefinition = {
      appName: appManifest.name.short,
      validDomains: appManifest.validDomains,
    };
    appDefinition.appId = appManifest.id;

    appDefinition.appName = appManifest.name.short;
    appDefinition.shortName = appManifest.name.short;
    appDefinition.version = appManifest.version;

    appDefinition.packageName = appManifest.packageName;
    appDefinition.websiteUrl = appManifest.developer.websiteUrl;
    appDefinition.privacyUrl = appManifest.developer.privacyUrl;
    appDefinition.termsOfUseUrl = appManifest.developer.termsOfUseUrl;

    appDefinition.shortDescription = appManifest.description.short;
    appDefinition.longDescription = appManifest.description.full;

    appDefinition.developerName = appManifest.developer.name;

    appDefinition.staticTabs = appManifest.staticTabs;
    appDefinition.configurableTabs = appManifest.configurableTabs;

    appDefinition.bots = convertToAppDefinitionBots(appManifest);
    appDefinition.messagingExtensions = convertToAppDefinitionMessagingExtensions(appManifest);

    if (appManifest.webApplicationInfo) {
      appDefinition.webApplicationInfoId = appManifest.webApplicationInfo.id;
      appDefinition.webApplicationInfoResource = appManifest.webApplicationInfo.resource;
    }

    if (!ignoreIcon && appManifest.icons.color) {
      appDefinition.colorIcon = appManifest.icons.color;
    }

    if (!ignoreIcon && appManifest.icons.outline) {
      appDefinition.outlineIcon = appManifest.icons.outline;
    }

    return appDefinition;
  }

  function convertToAppDefinitionMessagingExtensions(
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

  function convertToAppDefinitionBots(appManifest: TeamsAppManifest): IAppDefinitionBot[] {
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
}
