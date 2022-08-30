// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import { BotFrameworkAdapter, ConversationReference, TeamsInfo, TurnContext } from "botbuilder";
import * as sinon from "sinon";
import { CommandBot } from "../../../../src/conversation/command";
import { CommandResponseMiddleware } from "../../../../src/conversation/middlewares/commandMiddleware";
import { TestCommandHandler } from "./testUtils";

describe("CommandBot Tests - Node", () => {
  const sandbox = sinon.createSandbox();
  let adapter: BotFrameworkAdapter;
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
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("create command bot should add correct middleware", () => {
    const commandBot = new CommandBot(adapter);
    assert.isTrue(middlewares[0] instanceof CommandResponseMiddleware);
  });

  it("command should be added through registerCommand API", () => {
    const commandBot = new CommandBot(adapter);
    commandBot.registerCommand(new TestCommandHandler("test"));

    assert.isTrue(middlewares[0] instanceof CommandResponseMiddleware);
    const middleware = middlewares[0] as CommandResponseMiddleware;

    assert.isNotEmpty(middleware.commandHandlers);
    assert.isTrue(middleware.commandHandlers.length === 1);
    assert.isTrue(middleware.commandHandlers[0] instanceof TestCommandHandler);
  });

  it("commands should be added through registerCommands API", () => {
    const commandBot = new CommandBot(adapter);
    const stringPattern = "test";
    const regExpPattern = /^test (.*?)$/i;
    commandBot.registerCommands([
      new TestCommandHandler(stringPattern),
      new TestCommandHandler(regExpPattern),
    ]);

    assert.isTrue(middlewares[0] instanceof CommandResponseMiddleware);
    const middleware = middlewares[0] as CommandResponseMiddleware;

    assert.isNotEmpty(middleware.commandHandlers);
    assert.isTrue(middleware.commandHandlers.length === 2);
    assert.isTrue(typeof middleware.commandHandlers[0].triggerPatterns === "string");
    assert.isTrue(middleware.commandHandlers[1].triggerPatterns instanceof RegExp);
  });
});
