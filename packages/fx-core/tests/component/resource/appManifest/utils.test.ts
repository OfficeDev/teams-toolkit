import * as chai from "chai";
import "mocha";
import { AppDefinition } from "../../../../src/component/resource/appManifest/interfaces/appDefinition";
import { Bot } from "../../../../src/component/resource/appManifest/interfaces/bot";
import { ConfigurableTab } from "../../../../src/component/resource/appManifest/interfaces/configurableTab";
import { MessagingExtension } from "../../../../src/component/resource/appManifest/interfaces/messagingExtension";
import { StaticTab } from "../../../../src/component/resource/appManifest/interfaces/staticTab";
import {
  CommandScope,
  hasMeetingExtension,
  MeetingsContext,
  needBotCode,
  needTabCode,
} from "../../../../src/component/resource/appManifest/utils/utils";

describe("utils", () => {
  const validBot: Bot = {
    botId: "botId",
    isNotificationOnly: false,
    needsChannelSelector: false,
    personalCommands: [{ title: "title", description: "description" }],
    supportsFiles: false,
    supportsCalling: false,
    supportsVideo: false,
    teamCommands: [{ title: "title", description: "description" }],
    groupChatCommands: [{ title: "title", description: "description" }],
    scopes: ["scope"],
  };

  const validConfigurableTabForTabCode: ConfigurableTab = {
    objectId: "objId",
    configurationUrl: "https://url",
    canUpdateConfiguration: false,
    scopes: [CommandScope.GroupChat],
    context: [MeetingsContext.ChannelTab],
    sharePointPreviewImage: "img",
    supportedSharePointHosts: [],
  };

  const validStaticTab: StaticTab = {
    objectId: "objId",
    entityId: "entityId",
    name: "tab",
    contentUrl: "https://url",
    websiteUrl: "https:/url",
    scopes: [],
    context: [],
  };

  const validMessagingExtension: MessagingExtension = {
    objectId: "objId",
    botId: "botId",
    canUpdateConfiguration: true,
    commands: [],
    messageHandlers: [],
  };

  const validConfigurableTabForMeetingExtension: ConfigurableTab = {
    objectId: "objId",
    configurationUrl: "https://url",
    canUpdateConfiguration: false,
    scopes: [CommandScope.GroupChat, CommandScope.Team],
    context: [MeetingsContext.SidePanel],
    sharePointPreviewImage: "img",
    supportedSharePointHosts: [],
  };

  describe("needTabCode", () => {
    it("undefined property: returns false", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        bots: [validBot],
      };

      const needTab = needTabCode(appDefinition);

      chai.assert.isFalse(needTab);
    });

    it("length is 0: returns false", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        configurableTabs: [],
        staticTabs: [],
        bots: [validBot],
      };

      const needTab = needTabCode(appDefinition);

      chai.assert.isFalse(needTab);
    });

    it("invalid group app context: returns false", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        configurableTabs: [
          { ...validConfigurableTabForTabCode, context: [MeetingsContext.SidePanel] },
        ],
        staticTabs: [],
        bots: [validBot],
      };

      const needTab = needTabCode(appDefinition);

      chai.assert.isFalse(needTab);
    });

    it("invalid group app scope: returns false", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        configurableTabs: [{ ...validConfigurableTabForTabCode, scopes: [CommandScope.Personal] }],
        staticTabs: [],
        bots: [validBot],
      };

      const needTab = needTabCode(appDefinition);

      chai.assert.isFalse(needTab);
    });

    it("valid static tab: returns true", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        staticTabs: [validStaticTab],
        bots: [validBot],
      };

      const needTab = needTabCode(appDefinition);

      chai.assert.isTrue(needTab);
    });

    it("channel tab, group channel scope: returns true", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        configurableTabs: [validConfigurableTabForTabCode],
        bots: [validBot],
      };

      const needTab = needTabCode(appDefinition);

      chai.assert.isTrue(needTab);
    });

    it("private chat tab, team scope: returns true", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        configurableTabs: [
          {
            ...validConfigurableTabForTabCode,
            context: [MeetingsContext.PrivateChatTab],
            scopes: [CommandScope.Team],
          },
        ],
        bots: [validBot],
      };

      const needTab = needTabCode(appDefinition);

      chai.assert.isTrue(needTab);
    });
  });

  describe("needBot", () => {
    it("undefined property: returns false", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
      };

      const needBot = needBotCode(appDefinition);

      chai.assert.isFalse(needBot);
    });

    it("length is 0: returns false", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        bots: [],
      };

      const needBot = needBotCode(appDefinition);

      chai.assert.isFalse(needBot);
    });

    it("has bot: returns true", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        bots: [validBot],
      };

      const needBot = needBotCode(appDefinition);

      chai.assert.isTrue(needBot);
    });

    it("has bot: returns true", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        bots: [validBot],
        messagingExtensions: [],
      };

      const needBot = needBotCode(appDefinition);

      chai.assert.isTrue(needBot);
    });

    it("has messaging extension: returns true", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        messagingExtensions: [validMessagingExtension],
      };

      const needBot = needBotCode(appDefinition);

      chai.assert.isTrue(needBot);
    });
  });

  describe("hasMeetingExtension", () => {
    it("undefined property: returns false", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        bots: [validBot],
      };

      const res = hasMeetingExtension(appDefinition);

      chai.assert.isFalse(res);
    });

    it("length is 0: returns false", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        configurableTabs: [],
        staticTabs: [],
        bots: [validBot],
      };

      const res = hasMeetingExtension(appDefinition);

      chai.assert.isFalse(res);
    });

    it("side panel: returns true", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        configurableTabs: [validConfigurableTabForMeetingExtension],
        staticTabs: [],
        bots: [validBot],
      };

      const res = hasMeetingExtension(appDefinition);

      chai.assert.isTrue(res);
    });

    it("details tab: returns true", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        configurableTabs: [
          { ...validConfigurableTabForMeetingExtension, context: [MeetingsContext.DetailsTab] },
        ],
        staticTabs: [],
        bots: [validBot],
      };

      const res = hasMeetingExtension(appDefinition);

      chai.assert.isTrue(res);
    });

    it("chat tab: returns true", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mockAppId",
        tenantId: "mockTenantId",
        configurableTabs: [
          { ...validConfigurableTabForMeetingExtension, context: [MeetingsContext.ChatTab] },
        ],
        staticTabs: [],
        bots: [validBot],
      };

      const res = hasMeetingExtension(appDefinition);

      chai.assert.isTrue(res);
    });
  });
});
