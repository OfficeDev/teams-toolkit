// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  BotFrameworkAdapter,
  CardFactory,
  ChannelInfo,
  ConversationReference,
  TeamsChannelAccount,
  TeamsInfo,
  TurnContext,
  TurnContextStateCollection,
} from "botbuilder";
import { ConnectorClient } from "botframework-connector";
import { Conversations } from "botframework-connector/lib/connectorApi/connectorClient";
import { assert, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import * as sinon from "sinon";
import { NotificationTargetType } from "../../../../src/conversation/interface";
import { NotificationMiddleware } from "../../../../src/conversation/middleware";
import {
  Channel,
  Member,
  NotificationBot,
  sendAdaptiveCard,
  sendMessage,
  TeamsBotInstallation,
} from "../../../../src/conversation/notification";
import * as utils from "../../../../src/conversation/utils";
import { TestStorage, TestTarget } from "./testUtils";

chaiUse(chaiPromises);

describe("Notification Tests - Node", () => {
  it("sendMessage should send correct text", async () => {
    const target = new TestTarget();
    await sendMessage(target, "test");
    assert.strictEqual(target.content, "test");
  });

  it("sendAdaptiveCard should send correct card", async () => {
    const target = new TestTarget();
    await sendAdaptiveCard(target, { foo: "bar" });
    assert.deepStrictEqual(target.content, { foo: "bar" });
  });

  describe("Channel Tests - Node", () => {
    const sandbox = sinon.createSandbox();
    let botInstallation: TeamsBotInstallation;
    let content: any;
    let activityResponse: any;

    beforeEach(() => {
      content = "";
      activityResponse = {};
      const stubContext = sandbox.createStubInstance(TurnContext);
      stubContext.sendActivity.callsFake((activityOrText, speak, inputHint) => {
        return new Promise((resolve) => {
          content = activityOrText;
          resolve(activityResponse);
        });
      });
      const stubAdapter = sandbox.createStubInstance(BotFrameworkAdapter);
      (
        stubAdapter.continueConversation as unknown as sinon.SinonStub<
          [Partial<ConversationReference>, (context: TurnContext) => Promise<void>],
          Promise<void>
        >
      ).callsFake(async (ref, logic) => {
        await logic(stubContext);
      });
      const conversationRef = {
        conversation: {
          conversationType: "channel",
        },
      };
      botInstallation = new TeamsBotInstallation(stubAdapter, conversationRef as any);
      sandbox.stub(TurnContext, "getConversationReference").returns({ conversation: {} } as any);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("sendMessage should send correct text", async () => {
      const channel = new Channel(botInstallation, { id: "1" } as ChannelInfo);
      assert.strictEqual(channel.type, "Channel");
      activityResponse = {
        id: "message-x",
      };
      let res = await channel.sendMessage("text");
      assert.strictEqual(content, "text");
      assert.deepStrictEqual(res, { id: "message-x" });
      activityResponse = undefined;
      res = await channel.sendMessage("text");
      assert.deepStrictEqual(res, { id: undefined });
    });

    it("sendAdaptiveCard should send correct card", async () => {
      sandbox.stub(CardFactory, "adaptiveCard").callsFake((card) => {
        return { content: card } as any;
      });
      const channel = new Channel(botInstallation, { id: "1" } as ChannelInfo);
      assert.strictEqual(channel.type, "Channel");
      activityResponse = {
        id: "message-x",
      };
      let res = await channel.sendAdaptiveCard({ foo: "bar" });
      assert.deepStrictEqual(content, {
        attachments: [
          {
            content: {
              foo: "bar",
            },
          },
        ],
      });
      assert.deepStrictEqual(res, { id: "message-x" });
      activityResponse = undefined;
      res = await channel.sendAdaptiveCard({ foo: "bar" });
      assert.deepStrictEqual(res, { id: undefined });
    });
  });

  describe("Member Tests - Node", () => {
    const sandbox = sinon.createSandbox();
    let botInstallation: TeamsBotInstallation;
    let content: any;
    let activityResponse: any;

    beforeEach(() => {
      content = "";
      activityResponse = {};
      const stubConversations = sandbox.createStubInstance(Conversations);
      stubConversations.createConversation.resolves({
        id: "1",
      } as any);
      const stubConnectorClient = sandbox.createStubInstance(ConnectorClient);
      stubConnectorClient.conversations = stubConversations;
      const stubTurnState = sandbox.createStubInstance(TurnContextStateCollection);
      stubTurnState.get.returns(stubConnectorClient);
      const stubContext = sandbox.createStubInstance(TurnContext);
      stubContext.sendActivity.callsFake((activityOrText, speak, inputHint) => {
        return new Promise((resolve) => {
          content = activityOrText;
          resolve(activityResponse);
        });
      });
      sandbox.stub(TurnContext.prototype, "turnState").get(() => stubTurnState);
      sandbox.stub(TurnContext.prototype, "activity").get(() => {
        return {
          conversation: {
            tenantId: "11",
          },
          recipient: {},
        };
      });
      const stubAdapter = sandbox.createStubInstance(BotFrameworkAdapter);
      (
        stubAdapter.continueConversation as unknown as sinon.SinonStub<
          [Partial<ConversationReference>, (context: TurnContext) => Promise<void>],
          Promise<void>
        >
      ).callsFake(async (ref, logic) => {
        await logic(stubContext);
      });
      const conversationRef = {
        conversation: {
          conversationType: "channel",
        },
      };
      botInstallation = new TeamsBotInstallation(stubAdapter, conversationRef as any);
      sandbox.stub(TurnContext, "getConversationReference").returns({ conversation: {} } as any);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("sendMessage should send correct text", async () => {
      const member = new Member(botInstallation, { id: "1" } as TeamsChannelAccount);
      assert.strictEqual(member.type, "Person");
      activityResponse = {
        id: "message-y",
      };
      let res = await member.sendMessage("text");
      assert.strictEqual(content, "text");
      assert.deepStrictEqual(res, { id: "message-y" });
      activityResponse = undefined;
      res = await member.sendMessage("text");
      assert.deepStrictEqual(res, { id: undefined });
    });

    it("sendAdaptiveCard should send correct card", async () => {
      sandbox.stub(CardFactory, "adaptiveCard").callsFake((card) => {
        return { content: card } as any;
      });
      const member = new Member(botInstallation, { id: "1" } as TeamsChannelAccount);
      assert.strictEqual(member.type, "Person");
      activityResponse = {
        id: "message-y",
      };
      let res = await member.sendAdaptiveCard({ foo: "bar" });
      assert.deepStrictEqual(content, {
        attachments: [
          {
            content: {
              foo: "bar",
            },
          },
        ],
      });
      assert.deepStrictEqual(res, { id: "message-y" });
      activityResponse = undefined;
      res = await member.sendAdaptiveCard({ foo: "bar" });
      assert.deepStrictEqual(res, { id: undefined });
    });
  });

  describe("TeamsBotInstallation Tests - Node", () => {
    const sandbox = sinon.createSandbox();
    let adapter: BotFrameworkAdapter;
    let context: TurnContext;
    let content: any;
    let activityResponse: any;

    beforeEach(() => {
      content = "";
      activityResponse = {};
      const stubAdapter = sandbox.createStubInstance(BotFrameworkAdapter);
      (
        stubAdapter.continueConversation as unknown as sinon.SinonStub<
          [Partial<ConversationReference>, (context: TurnContext) => Promise<void>],
          Promise<void>
        >
      ).callsFake(async (ref, logic) => {
        await logic(context);
      });
      adapter = stubAdapter;
      const stubContext = sandbox.createStubInstance(TurnContext);
      stubContext.sendActivity.callsFake((activityOrText, speak, inputHint) => {
        return new Promise((resolve) => {
          content = activityOrText;
          resolve(activityResponse);
        });
      });
      context = stubContext;
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("sendMessage should send correct text", async () => {
      const conversationRef = {
        conversation: {
          conversationType: "channel",
        },
      };
      const installation = new TeamsBotInstallation(adapter, conversationRef as any);
      assert.strictEqual(installation.type, NotificationTargetType.Channel);
      assert.isTrue(installation.type === "Channel");
      activityResponse = {
        id: "message-a",
      };
      let res = await installation.sendMessage("text");
      assert.strictEqual(content, "text");
      assert.deepStrictEqual(res, { id: "message-a" });
      activityResponse = undefined;
      res = await installation.sendMessage("text");
      assert.deepStrictEqual(res, { id: undefined });
    });

    it("sendAdaptiveCard should send correct card", async () => {
      sandbox.stub(CardFactory, "adaptiveCard").callsFake((card) => {
        return { content: card } as any;
      });
      const conversationRef = {
        conversation: {
          conversationType: "channel",
        },
      };
      const installation = new TeamsBotInstallation(adapter, conversationRef as any);
      assert.strictEqual(installation.type, NotificationTargetType.Channel);
      assert.isTrue(installation.type === "Channel");
      activityResponse = {
        id: "message-a",
      };
      let res = await installation.sendAdaptiveCard({ foo: "bar" });
      assert.deepStrictEqual(content, {
        attachments: [
          {
            content: {
              foo: "bar",
            },
          },
        ],
      });
      assert.deepStrictEqual(res, { id: "message-a" });
      activityResponse = undefined;
      res = await installation.sendAdaptiveCard({ foo: "bar" });
      assert.deepStrictEqual(res, { id: undefined });
    });

    it("channels should return correct channels", async () => {
      sandbox.stub(utils, "getTeamsBotInstallationId").returns("test");
      sandbox.stub(TeamsInfo, "getTeamChannels").resolves([{} as ChannelInfo, {} as ChannelInfo]);
      const conversationRef = {
        conversation: {
          conversationType: "channel",
        },
      };
      const installation = new TeamsBotInstallation(adapter, conversationRef as any);
      assert.strictEqual(installation.type, NotificationTargetType.Channel);
      assert.isTrue(installation.type === "Channel");
      const channels = await installation.channels();
      assert.strictEqual(channels.length, 2);
    });

    it("channels should return empty array if no teamId", async () => {
      sandbox.stub(utils, "getTeamsBotInstallationId").returns(undefined);
      const conversationRef = {
        conversation: {
          conversationType: "channel",
        },
      };
      const installation = new TeamsBotInstallation(adapter, conversationRef as any);
      assert.strictEqual(installation.type, NotificationTargetType.Channel);
      assert.isTrue(installation.type === "Channel");
      const channels = await installation.channels();
      assert.strictEqual(channels.length, 0);
    });

    it("members should return correct members", async () => {
      sandbox.stub(TeamsInfo, "getPagedMembers").resolves({
        continuationToken: undefined as unknown as string,
        members: [{} as TeamsChannelAccount, {} as TeamsChannelAccount],
      });
      const conversationRef = {
        conversation: {
          conversationType: "channel",
        },
      };
      const installation = new TeamsBotInstallation(adapter, conversationRef as any);
      assert.strictEqual(installation.type, NotificationTargetType.Channel);
      assert.isTrue(installation.type === "Channel");
      const members = await installation.members();
      assert.strictEqual(members.length, 2);
    });
  });
});

describe("Notification Bot Tests - Node", () => {
  const sandbox = sinon.createSandbox();
  let adapter: BotFrameworkAdapter;
  let storage: TestStorage;
  let middlewares: any[];

  beforeEach(() => {
    middlewares = [];
    const stubContext = sandbox.createStubInstance(TurnContext);
    const stubAdapter = sandbox.createStubInstance(BotFrameworkAdapter);
    stubAdapter.use.callsFake((args) => {
      middlewares.push(args);
      return stubAdapter;
    });
    (
      stubAdapter.continueConversation as unknown as sinon.SinonStub<
        [Partial<ConversationReference>, (context: TurnContext) => Promise<void>],
        Promise<void>
      >
    ).callsFake(async (ref, logic) => {
      await logic(stubContext);
    });
    adapter = stubAdapter;
    storage = new TestStorage();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("initialize notification should create correct middleware", () => {
    const notificationBot = new NotificationBot(adapter, { storage: storage });
    assert.strictEqual(middlewares.length, 1);
    assert.isTrue(middlewares[0] instanceof NotificationMiddleware);
  });

  it("installations should return correct targets", async () => {
    sandbox.stub(TeamsInfo, "getPagedMembers").callsFake((ctx, pageSize, continuationToken) => {
      return new Promise((resolve) => resolve({ continuationToken: "", members: [] }));
    });

    const notificationBot = new NotificationBot(adapter, { storage: storage });
    storage.items = {
      _a_1: {
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      },
      _a_2: {
        channelId: "2",
        conversation: {
          id: "2",
          tenantId: "a",
        },
      },
    };
    const installations = await notificationBot.installations();
    assert.strictEqual(installations.length, 2);
    assert.strictEqual(installations[0].conversationReference.conversation?.id, "1");
    assert.strictEqual(installations[1].conversationReference.conversation?.id, "2");
  });

  it("installations should remove invalid target", async () => {
    sandbox.stub(TeamsInfo, "getPagedMembers").callsFake((ctx, pageSize, continuationToken) => {
      throw {
        name: "test",
        message: "test",
        code: "BotNotInConversationRoster",
      };
    });

    const notificationBot = new NotificationBot(adapter, { storage: storage });
    storage.items = {
      _a_1: {
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      },
    };
    const installations = await notificationBot.installations();
    assert.strictEqual(installations.length, 0);
    assert.deepStrictEqual(storage.items, {});
  });

  it("installations should keep valid target", async () => {
    sandbox.stub(TeamsInfo, "getPagedMembers").callsFake((ctx, pageSize, continuationToken) => {
      throw {
        name: "test",
        message: "test",
        code: "Throttled",
      };
    });

    const notificationBot = new NotificationBot(adapter, { storage: storage });
    storage.items = {
      _a_1: {
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      },
    };
    const installations = await notificationBot.installations();
    assert.strictEqual(installations.length, 1);
    assert.strictEqual(installations[0].conversationReference.conversation?.id, "1");
    assert.deepStrictEqual(storage.items, {
      _a_1: {
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      },
    });
  });
});
