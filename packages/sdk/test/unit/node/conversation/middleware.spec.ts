// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConversationReference, TurnContext } from "botbuilder";
import { assert, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import * as sinon from "sinon";
import {
  CommandResponseMiddleware,
  NotificationMiddleware,
} from "../../../../src/conversation/middleware";
import { ConversationReferenceStore } from "../../../../src/conversation/storage";
import { MockContext, TestCommandHandler, TestStorage } from "./testUtils";

chaiUse(chaiPromises);

describe("CommandResponse Middleware Tests - Node", () => {
  it("onTurn should correctly trigger command if matches string", async () => {
    const testContext = new MockContext("test");

    const testCommandHandler = new TestCommandHandler("test");
    const middleware = new CommandResponseMiddleware([testCommandHandler]);
    await middleware.onTurn(testContext as any, async () => {});

    // Assert the test command handler is invoked
    assert.isTrue(testCommandHandler.isInvoked);
  });

  it("onTurn should correctly trigger command if matches string array", async () => {
    const testContext1 = new MockContext("test1");
    const testContext2 = new MockContext("tes2");

    const testCommandHandler = new TestCommandHandler(["test1", "test2"]);
    const middleware = new CommandResponseMiddleware([testCommandHandler]);
    await middleware.onTurn(testContext1 as any, async () => {});

    // Assert the test command handler is invoked
    assert.isTrue(testCommandHandler.isInvoked);

    await middleware.onTurn(testContext2 as any, async () => {});

    // Assert the test command handler is invoked
    assert.isTrue(testCommandHandler.isInvoked);
  });

  it("onTurn should correctly handle command if matches regexp", async () => {
    const testContext = new MockContext("test some-input");

    const testCommandHandler = new TestCommandHandler(/^test (.*?)$/i);
    const middleware = new CommandResponseMiddleware([testCommandHandler]);
    await middleware.onTurn(testContext as any, async () => {});

    // Assert the test command handler is invoked
    assert.isTrue(testCommandHandler.isInvoked);
    assert.isDefined(testCommandHandler.lastReceivedMessage);

    const args = testCommandHandler.lastReceivedMessage?.matches as RegExpMatchArray;
    assert.isTrue(args.length === 2);
    assert.isTrue(args[1] === "some-input");
  });

  it("onTurn should correctly handle command if matches regexp array", async () => {
    const testContext1 = new MockContext("test1 some-input");
    const testContext2 = new MockContext("test2 some-input");

    const testCommandHandler = new TestCommandHandler([/^test1 (.*?)$/i, /^test2 (.*?)$/i]);
    const middleware = new CommandResponseMiddleware([testCommandHandler]);
    await middleware.onTurn(testContext1 as any, async () => {});

    // Assert the test command handler is invoked
    assert.isTrue(testCommandHandler.isInvoked);

    await middleware.onTurn(testContext2 as any, async () => {});

    // Assert the test command handler is invoked
    assert.isTrue(testCommandHandler.isInvoked);
  });

  it("onTurn should skip handling command if the text is not acceptable ", async () => {
    const testContext = new MockContext("invalid input");

    const testCommandHandler = new TestCommandHandler("test");
    const middleware = new CommandResponseMiddleware([testCommandHandler]);
    await middleware.onTurn(testContext as any, async () => {});

    // Assert the test command handler is invoked
    assert.isFalse(testCommandHandler.isInvoked);
  });
});

describe("Notification Middleware Tests - Node", () => {
  const sandbox = sinon.createSandbox();
  const testStorage = new TestStorage();
  const middleware = new NotificationMiddleware({
    conversationReferenceStore: new ConversationReferenceStore(testStorage),
  });

  beforeEach(() => {
    testStorage.items = {};
    sandbox.stub(TurnContext, "getConversationReference").callsFake((activity) => {
      const reference = {
        channelId: activity.channelId,
        conversation: {
          id: activity.conversation?.id,
          tenantId: activity.conversation?.tenantId,
        },
      } as ConversationReference;
      if (activity.conversation?.conversationType !== undefined) {
        reference.conversation.conversationType = activity.conversation?.conversationType;
      }
      return reference;
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

  it("onTurn should correctly handle bot messaged in channel (new)", async () => {
    const testContext = {
      activity: {
        type: "message",
        channelId: "1",
        channelData: {
          team: {
            id: "X",
          },
        },
        conversation: {
          id: "1",
          conversationType: "channel",
          tenantId: "a",
        },
        recipient: {
          id: "A",
        },
      },
    };
    await middleware.onTurn(testContext as any, async () => {});
    assert.deepStrictEqual(testStorage.items, {
      _a_X: {
        channelId: "1",
        conversation: {
          id: "X",
          conversationType: "channel",
          tenantId: "a",
        },
      },
    });
  });

  it("onTurn should correctly handle bot messaged in channel (exist)", async () => {
    testStorage.items = {
      _a_X: {
        channelId: "1",
        conversation: {
          id: "X",
          conversationType: "channel",
          tenantId: "a",
        },
      },
    };
    const testContext = {
      activity: {
        type: "message",
        channelId: "xxxxxxxxx",
        channelData: {
          team: {
            id: "X",
          },
        },
        conversation: {
          id: "1",
          conversationType: "channel",
          tenantId: "a",
        },
        recipient: {
          id: "A",
        },
      },
    };
    await middleware.onTurn(testContext as any, async () => {});
    assert.deepStrictEqual(testStorage.items, {
      _a_X: {
        channelId: "1",
        conversation: {
          id: "X",
          conversationType: "channel",
          tenantId: "a",
        },
      },
    });
  });

  it("onTurn should correctly handle bot messaged in chat (new)", async () => {
    const testContext = {
      activity: {
        type: "message",
        channelId: "1",
        conversation: {
          id: "1",
          conversationType: "groupChat",
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
          conversationType: "groupChat",
          tenantId: "a",
        },
      },
    });
  });

  it("onTurn should ignore bot messaged in chat (exist)", async () => {
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
          conversationType: "groupChat",
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
