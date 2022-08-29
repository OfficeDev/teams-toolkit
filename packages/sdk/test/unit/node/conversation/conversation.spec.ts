// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BotFrameworkAdapter, TurnContext } from "botbuilder";
import { assert, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import * as sinon from "sinon";
import { ConversationBot } from "../../../../src/conversation/conversation";

chaiUse(chaiPromises);

describe("ConversationBot Tests - Node", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("Create with default options", () => {
    const conversationBot = new ConversationBot({});
    assert.isDefined(conversationBot.adapter);
    assert.isDefined(conversationBot.adapter.onTurnError);
    assert.isUndefined(conversationBot.command);
    assert.isUndefined(conversationBot.notification);
    assert.isUndefined(conversationBot.cardAction);
  });

  it("Create with customized adapter", () => {
    const adapter = sandbox.createStubInstance(BotFrameworkAdapter);
    const conversationBot = new ConversationBot({ adapter: adapter });
    assert.isDefined(conversationBot.adapter);
    assert.equal(conversationBot.adapter, adapter);
    assert.isUndefined(conversationBot.command);
    assert.isUndefined(conversationBot.notification);
    assert.isUndefined(conversationBot.cardAction);
  });

  it("Create with customized adapterConfig", () => {
    const conversationBot = new ConversationBot({ adapterConfig: { foo: "bar" } });
    assert.isDefined(conversationBot.adapter);
    assert.isDefined(conversationBot.adapter.onTurnError);
    assert.isUndefined(conversationBot.command);
    assert.isUndefined(conversationBot.notification);
    assert.isUndefined(conversationBot.cardAction);
  });

  it("Create with all enabled", () => {
    const conversationBot = new ConversationBot({
      command: { enabled: true },
      notification: { enabled: true },
      cardAction: { enabled: true },
    });
    assert.isDefined(conversationBot.adapter);
    assert.isDefined(conversationBot.adapter.onTurnError);
    assert.isDefined(conversationBot.command);
    assert.isDefined(conversationBot.notification);
    assert.isDefined(conversationBot.cardAction);
  });

  it("requestHandler correctly handles empty logic", async () => {
    const adapter = sandbox.createStubInstance(BotFrameworkAdapter);
    const context = sandbox.createStubInstance(TurnContext);
    let called = false;
    adapter.processActivity.callsFake(async (req, res, logic) => {
      await logic(context);
      called = true;
    });

    const conversationBot = new ConversationBot({ adapter: adapter });
    await conversationBot.requestHandler({} as any, {} as any);
    assert.isTrue(called);
  });

  it("requestHandler correctly handles non-empty logic", async () => {
    const adapter = sandbox.createStubInstance(BotFrameworkAdapter);
    const context = sandbox.createStubInstance(TurnContext);
    adapter.processActivity.callsFake(async (req, res, logic) => {
      await logic(context);
    });

    let called = false;
    const conversationBot = new ConversationBot({ adapter: adapter });
    await conversationBot.requestHandler({} as any, {} as any, async (ctx) => {
      called = true;
    });
    assert.isTrue(called);
  });
});
