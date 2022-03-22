import { ConversationReference, TurnContext } from "botbuilder";
import { assert, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import * as sinon from "sinon";
import { NotificationMiddleware } from "../../../../src/notification/middleware";
import { ConversationReferenceStore } from "../../../../src/notification/storage";
import { TestStorage } from "./testUtils";

chaiUse(chaiPromises);

describe("Notification.Middleware Tests - Node", () => {
  const sandbox = sinon.createSandbox();
  const testStorage = new TestStorage();
  const middleware = new NotificationMiddleware({
    conversationReferenceStore: new ConversationReferenceStore(testStorage),
  });

  beforeEach(() => {
    testStorage.items = {};
    sandbox.stub(TurnContext, "getConversationReference").callsFake((activity) => {
      return {
        channelId: activity.channelId,
        conversation: {
          id: activity.conversation?.id,
          tenantId: activity.conversation?.tenantId,
        },
      } as ConversationReference;
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("onTurn should correctly handle bot installed", async () => {
    const testContext = {
      activity: {
        action: "add",
        type: "installationUpdate",
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
        recipient: {
          id: "A",
        },
      },
    };
    await middleware.onTurn(testContext as any, async () => {});
    assert.deepStrictEqual(testStorage.items, {
      _a_1: {
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      },
    });
  });

  it("onTurn should correctly handle bot uninstalled", async () => {
    testStorage.items = {
      _a_1: {
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      },
    };
    const testContext = {
      activity: {
        action: "remove",
        type: "installationUpdate",
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
        recipient: {
          id: "A",
        },
      },
    };
    await middleware.onTurn(testContext as any, async () => {});
    assert.deepStrictEqual(testStorage.items, {});
  });

  it("onTurn should correctly handle bot messaged (new)", async () => {
    const testContext = {
      activity: {
        type: "message",
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
        recipient: {
          id: "A",
        },
      },
    };
    await middleware.onTurn(testContext as any, async () => {});
    assert.deepStrictEqual(testStorage.items, {
      _a_1: {
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      },
    });
  });

  it("onTurn should correctly handle bot messaged (exist)", async () => {
    testStorage.items = {
      _a_1: {
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      },
    };
    const testContext = {
      activity: {
        type: "message",
        channelId: "xxxxxxxxx",
        conversation: {
          id: "1",
          tenantId: "a",
        },
        recipient: {
          id: "A",
        },
      },
    };
    await middleware.onTurn(testContext as any, async () => {});
    assert.deepStrictEqual(testStorage.items, {
      _a_1: {
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      },
    });
  });

  it("onTurn should correctly handle team deleted", async () => {
    testStorage.items = {
      _a_1: {
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      },
    };
    const testContext = {
      activity: {
        type: "conversationUpdate",
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
        recipient: {
          id: "A",
        },
        channelData: {
          eventType: "teamDeleted",
        },
      },
    };
    await middleware.onTurn(testContext as any, async () => {});
    assert.deepStrictEqual(testStorage.items, {});
  });

  it("onTurn should correctly handle team restored", async () => {
    const testContext = {
      activity: {
        type: "conversationUpdate",
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
        recipient: {
          id: "A",
        },
        channelData: {
          eventType: "teamRestored",
        },
      },
    };
    await middleware.onTurn(testContext as any, async () => {});
    assert.deepStrictEqual(testStorage.items, {
      _a_1: {
        channelId: "1",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      },
    });
  });

  it("onTurn should ignore non-bot event", async () => {
    const testContext = {
      activity: {
        channelId: "1",
        recipient: {
          id: "B",
        },
      },
    };
    await middleware.onTurn(testContext as any, async () => {});
    assert.deepStrictEqual(testStorage.items, {});
  });
});
