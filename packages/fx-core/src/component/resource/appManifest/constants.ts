// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IBot, IComposeExtension, IConfigurableTab, IStaticTab } from "@microsoft/teamsfx-api";
import { ComponentNames } from "../../constants";

const AAD_STATE_KEY = ComponentNames.AadApp;
const TAB_STATE_KEY = ComponentNames.TeamsTab;
const BOT_STATE_KEY = ComponentNames.TeamsBot;
const APP_MANIFEST_KEY = ComponentNames.AppManifest;

export const TEAMS_APP_MANIFEST_TEMPLATE = `{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
  "manifestVersion": "1.14",
  "version": "1.0.0",
  "id": "{{state.${APP_MANIFEST_KEY}.teamsAppId}}",
  "packageName": "com.microsoft.teams.extension",
  "developer": {
      "name": "Teams App, Inc.",
      "websiteUrl": "{{{state.${TAB_STATE_KEY}.endpoint}}}",
      "privacyUrl": "{{{state.${TAB_STATE_KEY}.endpoint}}}{{{state.${TAB_STATE_KEY}.indexPath}}}/privacy",
      "termsOfUseUrl": "{{{state.${TAB_STATE_KEY}.endpoint}}}{{{state.${TAB_STATE_KEY}.indexPath}}}/termsofuse"
  },
  "icons": {
      "color": "{{config.manifest.icons.color}}",
      "outline": "{{config.manifest.icons.outline}}"
  },
  "name": {
      "short": "{{config.manifest.appName.short}}",
      "full": "{{config.manifest.appName.full}}"
  },
  "description": {
      "short": "{{config.manifest.description.short}}",
      "full": "{{config.manifest.description.full}}"
  },
  "accentColor": "#FFFFFF",
  "bots": [],
  "composeExtensions": [],
  "configurableTabs": [],
  "staticTabs": [],
  "permissions": [
      "identity",
      "messageTeamMembers"
  ],
  "validDomains": []
}`;

export const STATIC_TABS_TPL_V3: IStaticTab[] = [
  {
    entityId: "index",
    name: "Personal Tab",
    contentUrl: `{{{state.${TAB_STATE_KEY}.endpoint}}}{{{state.${TAB_STATE_KEY}.indexPath}}}/tab`,
    websiteUrl: `{{{state.${TAB_STATE_KEY}.endpoint}}}{{{state.${TAB_STATE_KEY}.indexPath}}}/tab`,
    scopes: ["personal"],
  },
];

export const CONFIGURABLE_TABS_TPL_V3: IConfigurableTab[] = [
  {
    configurationUrl: `{{{state.${TAB_STATE_KEY}.endpoint}}}{{{state.${TAB_STATE_KEY}.indexPath}}}/config`,
    canUpdateConfiguration: true,
    scopes: ["team", "groupchat"],
  },
];

export const BOT_ID_PLACEHOLDER = `{{state.${BOT_STATE_KEY}.botId}}`;

export const BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V3: IBot[] = [
  {
    botId: BOT_ID_PLACEHOLDER,
    scopes: ["personal", "team", "groupchat"],
    supportsFiles: false,
    isNotificationOnly: false,
    commandLists: [
      {
        scopes: ["personal", "team", "groupchat"],
        commands: [
          {
            title: "helloWorld",
            description: "A helloworld command to send a welcome message",
          },
        ],
      },
    ],
  },
];

export const BOTS_TPL_FOR_NOTIFICATION_V3: IBot[] = [
  {
    botId: BOT_ID_PLACEHOLDER,
    scopes: ["personal", "team", "groupchat"],
    supportsFiles: false,
    isNotificationOnly: false,
  },
];

export const BOTS_TPL_V3: IBot[] = [
  {
    botId: BOT_ID_PLACEHOLDER,
    scopes: ["personal", "team", "groupchat"],
    supportsFiles: false,
    isNotificationOnly: false,
    commandLists: [
      {
        scopes: ["personal", "team", "groupchat"],
        commands: [
          {
            title: "welcome",
            description: "Resend welcome card of this Bot",
          },
          {
            title: "learn",
            description: "Learn about Adaptive Card and Bot Command",
          },
        ],
      },
    ],
  },
];
export const COMPOSE_EXTENSIONS_TPL_M365_V3: IComposeExtension[] = [
  {
    botId: BOT_ID_PLACEHOLDER,
    commands: [
      {
        id: "searchQuery",
        context: ["compose", "commandBox"],
        description: "Test command to run query",
        title: "Search",
        type: "query",
        parameters: [
          {
            name: "searchQuery",
            title: "Search Query",
            description: "Your search query",
            inputType: "text",
          },
        ],
      },
    ],
  },
];
export const COMPOSE_EXTENSIONS_TPL_V3: IComposeExtension[] = [
  {
    botId: BOT_ID_PLACEHOLDER,
    commands: [
      {
        id: "createCard",
        context: ["compose"],
        description: "Command to run action to create a Card from Compose Box",
        title: "Create Card",
        type: "action",
        parameters: [
          {
            name: "title",
            title: "Card title",
            description: "Title for the card",
            inputType: "text",
          },
          {
            name: "subTitle",
            title: "Subtitle",
            description: "Subtitle for the card",
            inputType: "text",
          },
          {
            name: "text",
            title: "Text",
            description: "Text for the card",
            inputType: "textarea",
          },
        ],
      },
      {
        id: "shareMessage",
        context: ["message"],
        description: "Test command to run action on message context (message sharing)",
        title: "Share Message",
        type: "action",
        parameters: [
          {
            name: "includeImage",
            title: "Include Image",
            description: "Include image in Hero Card",
            inputType: "toggle",
          },
        ],
      },
      {
        id: "searchQuery",
        context: ["compose", "commandBox"],
        description: "Test command to run query",
        title: "Search",
        type: "query",
        parameters: [
          {
            name: "searchQuery",
            title: "Search Query",
            description: "Your search query",
            inputType: "text",
          },
        ],
      },
    ],
    messageHandlers: [
      {
        type: "link",
        value: {
          domains: ["*.botframework.com"],
        },
      },
    ],
  },
];

export const WEB_APPLICATION_INFO_V3 = {
  id: `{{state.${AAD_STATE_KEY}.clientId}}`,
  resource: `{{{state.${AAD_STATE_KEY}.applicationIdUris}}}`,
};

export function getAppStudioEndpoint(): string {
  if (process.env.APP_STUDIO_ENV && process.env.APP_STUDIO_ENV === "int") {
    return "https://dev-int.teams.microsoft.com";
  } else {
    return "https://dev.teams.microsoft.com";
  }
}

export const AppStudioScopes = [`${getAppStudioEndpoint()}/AppDefinitions.ReadWrite`];
