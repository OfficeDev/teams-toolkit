// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IBot, IComposeExtension, IConfigurableTab, IStaticTab } from "@microsoft/teamsfx-api";

export const TAB_COMPONENT_NAME = "teams-tab";

export const AAD_COMPONENT_NAME = "aad-app";

export const TEAMS_APP_MANIFEST_TEMPLATE = `{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.11/MicrosoftTeams.schema.json",
  "manifestVersion": "1.11",
  "version": "1.0.0",
  "id": "{{state.app-manifest.teamsAppId}}",
  "packageName": "com.microsoft.teams.extension",
  "developer": {
      "name": "Teams App, Inc.",
      "websiteUrl": "{{{state.${TAB_COMPONENT_NAME}.endpoint}}}",
      "privacyUrl": "{{{state.${TAB_COMPONENT_NAME}.endpoint}}}{{{state.${TAB_COMPONENT_NAME}.indexPath}}}/privacy",
      "termsOfUseUrl": "{{{state.${TAB_COMPONENT_NAME}.endpoint}}}{{{state.${TAB_COMPONENT_NAME}.indexPath}}}/termsofuse"
  },
  "icons": {
      "color": "resources/color.png",
      "outline": "resources/outline.png"
  },
  "name": {
      "short": "{{config.manifest.appName.short}}",
      "full": "{{config.manifest.appName.full}}"
  },
  "description": {
      "short": "Short description of {{config.manifest.appName.short}}",
      "full": "Full description of {{config.manifest.appName.short}}"
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
    contentUrl: `{{{state.${TAB_COMPONENT_NAME}.endpoint}}}{{{state.${TAB_COMPONENT_NAME}.indexPath}}}/tab`,
    websiteUrl: `{{{state.${TAB_COMPONENT_NAME}.endpoint}}}{{{state.${TAB_COMPONENT_NAME}.indexPath}}}/tab`,
    scopes: ["personal"],
  },
];

export const CONFIGURABLE_TABS_TPL_V3: IConfigurableTab[] = [
  {
    configurationUrl: `{{{state.${TAB_COMPONENT_NAME}.endpoint}}}{{{state.${TAB_COMPONENT_NAME}.indexPath}}}/config`,
    canUpdateConfiguration: true,
    scopes: ["team", "groupchat"],
  },
];

export const BOT_ID_PLACEHOLDER = "{{state.bot-service.botId}}";

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
  id: `{{state.${AAD_COMPONENT_NAME}.clientId}}`,
  resource: `{{{state.${AAD_COMPONENT_NAME}.applicationIdUris}}}`,
};
