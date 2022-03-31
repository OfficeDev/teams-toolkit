import { TestCommandHandler, TestStorage } from "./testUtils";
import { assert } from "chai";
import { BotFrameworkAdapter, ConversationReference, TeamsInfo, TurnContext } from "botbuilder";
import * as sinon from "sinon";
import { ConversationBot } from "../../../../src/conversation/conversation";
import {
  CommandResponseMiddleware,
  NotificationMiddleware,
} from "../../../../src/conversation/middleware";

describe("ConversationBot Tests - Node", () => {
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
    ConversationBot.initialize(adapter, {
      enableNotification: true,
      storage: storage,
    });
    assert.strictEqual(middlewares.length, 1);
    assert.isTrue(middlewares[0] instanceof NotificationMiddleware);
  });

  it("initialize command-response should create correct middleware", () => {
    ConversationBot.initialize(adapter, {
      commandHandlers: [new TestCommandHandler()],
    });
    assert.strictEqual(middlewares.length, 1);
    assert.isTrue(middlewares[0] instanceof CommandResponseMiddleware);
  });

  it("initialize command-response and notification should create correct middlewares", () => {
    ConversationBot.initialize(adapter, {
      enableNotification: true,
      commandHandlers: [new TestCommandHandler()],
    });
    assert.strictEqual(middlewares.length, 2);
    assert.isTrue(middlewares[0] instanceof NotificationMiddleware);
    assert.isTrue(middlewares[1] instanceof CommandResponseMiddleware);
  });

  it("installations should return correct targets", async () => {
    sandbox.stub(TeamsInfo, "getPagedMembers").callsFake((ctx, pageSize, continuationToken) => {
      return new Promise((resolve) => resolve({ continuationToken: "", members: [] }));
    });
    ConversationBot.initialize(adapter, {
      enableNotification: true,
      storage: storage,
    });
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
    const installations = await ConversationBot.installations();
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
    ConversationBot.initialize(adapter, {
      enableNotification: true,
      storage: storage,
    });
    storage.items = {
      _a_1: {
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      },
    };
    const installations = await ConversationBot.installations();
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
    ConversationBot.initialize(adapter, {
      enableNotification: true,
      storage: storage,
    });
    storage.items = {
      _a_1: {
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      },
    };
    const installations = await ConversationBot.installations();
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
