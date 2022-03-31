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
import {
  Channel,
  Member,
  sendAdaptiveCard,
  sendMessage,
  TeamsBotInstallation,
} from "../../../../src/conversation/notification";
import * as utils from "../../../../src/conversation/utils";
import { TestTarget } from "./testUtils";

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

    beforeEach(() => {
      content = "";
      const stubContext = sandbox.createStubInstance(TurnContext);
      stubContext.sendActivity.callsFake((activityOrText, speak, inputHint) => {
        return new Promise((resolve) => {
          content = activityOrText;
          resolve(undefined);
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
      await channel.sendMessage("text");
      assert.strictEqual(content, "text");
    });

    it("sendAdaptiveCard should send correct card", async () => {
      sandbox.stub(CardFactory, "adaptiveCard").callsFake((card) => {
        return { content: card } as any;
      });
      const channel = new Channel(botInstallation, { id: "1" } as ChannelInfo);
      assert.strictEqual(channel.type, "Channel");
      await channel.sendAdaptiveCard({ foo: "bar" });
      assert.deepStrictEqual(content, {
        attachments: [
          {
            content: {
              foo: "bar",
            },
          },
        ],
      });
    });
  });

  describe("Member Tests - Node", () => {
    const sandbox = sinon.createSandbox();
    let botInstallation: TeamsBotInstallation;
    let content: any;

    beforeEach(() => {
      content = "";
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
          resolve(undefined);
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
      await member.sendMessage("text");
      assert.strictEqual(content, "text");
    });

    it("sendAdaptiveCard should send correct card", async () => {
      sandbox.stub(CardFactory, "adaptiveCard").callsFake((card) => {
        return { content: card } as any;
      });
      const member = new Member(botInstallation, { id: "1" } as TeamsChannelAccount);
      assert.strictEqual(member.type, "Person");
      await member.sendAdaptiveCard({ foo: "bar" });
      assert.deepStrictEqual(content, {
        attachments: [
          {
            content: {
              foo: "bar",
            },
          },
        ],
      });
    });
  });

  describe("TeamsBotInstallation Tests - Node", () => {
    const sandbox = sinon.createSandbox();
    let adapter: BotFrameworkAdapter;
    let context: TurnContext;
    let content: any;

    beforeEach(() => {
      content = "";
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
          resolve(undefined);
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
      assert.strictEqual(installation.type, "Channel");
      await installation.sendMessage("text");
      assert.strictEqual(content, "text");
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
      assert.strictEqual(installation.type, "Channel");
      await installation.sendAdaptiveCard({ foo: "bar" });
      assert.deepStrictEqual(content, {
        attachments: [
          {
            content: {
              foo: "bar",
            },
          },
        ],
      });
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
      assert.strictEqual(installation.type, "Channel");
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
      assert.strictEqual(installation.type, "Channel");
      const channels = await installation.channels();
      assert.strictEqual(channels.length, 0);
    });

    it("members should return correct members", async () => {
      sandbox
        .stub(TeamsInfo, "getMembers")
        .resolves([{} as TeamsChannelAccount, {} as TeamsChannelAccount]);
      const conversationRef = {
        conversation: {
          conversationType: "channel",
        },
      };
      const installation = new TeamsBotInstallation(adapter, conversationRef as any);
      assert.strictEqual(installation.type, "Channel");
      const members = await installation.members();
      assert.strictEqual(members.length, 2);
    });
  });
});
