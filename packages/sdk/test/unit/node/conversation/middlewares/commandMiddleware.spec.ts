// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import * as sinon from "sinon";
import { CommandResponseMiddleware } from "../../../../../src/conversation/middlewares/commandMiddleware";
import { MockContext, TestCommandHandler, TestSsoCommandHandler } from "../testUtils";
import { DefaultBotSsoExecutionActivityHandler } from "../../../../../src/conversation/sso/defaultBotSsoExecutionActivityHandler";
import { BotSsoConfig } from "../../../../../src/conversation/interface";
chaiUse(chaiPromises);

describe("CommandResponse Middleware Tests - Node", () => {
  const clientId = "fake_client_id";
  const clientSecret = "fake_client_secret";
  const tenantId = "fake_tenant";
  const authorityHost = "fake_authority_host";
  const initiateLoginEndpoint = "fake_initiate_login_endpoint";
  const ssoConfig: BotSsoConfig = {
    aad: {
      scopes: ["User.Read"],
      clientId,
      clientSecret,
      tenantId,
      authorityHost,
      initiateLoginEndpoint,
    },
  };

  afterEach(() => {
    sinon.restore();
  });

  it("add sso command should work", async () => {
    const testCommandHandler = new TestCommandHandler("test");
    const middleware = new CommandResponseMiddleware([testCommandHandler]);

    const testSsoCommand = new TestSsoCommandHandler("test");
    middleware.addSsoCommand(testSsoCommand);
    assert.isTrue(middleware.hasSsoCommand);
    assert.isTrue(middleware.ssoCommandHandlers.length === 1);
  });

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

  it("onTurn should correctly trigger sso command activity handler", async () => {
    const testContext = new MockContext("test");
    const testSsoCommand = new TestSsoCommandHandler("test");
    const defaultBotSsoExecutionActivityHandler = new DefaultBotSsoExecutionActivityHandler(
      ssoConfig
    );
    const stub = sinon.stub(defaultBotSsoExecutionActivityHandler, "run").resolves();

    const middleware = new CommandResponseMiddleware(
      [],
      [testSsoCommand],
      defaultBotSsoExecutionActivityHandler
    );

    await middleware.onTurn(testContext as any, async () => {});
    expect(stub.called).to.be.true;
    expect(stub.calledOnceWith(testContext as any));
  });

  it("onTurn should be called if context is not a message activity", async () => {
    const testContext = new MockContext("test", "invoke");
    const testSsoCommand = new TestSsoCommandHandler("test");
    const defaultBotSsoExecutionActivityHandler = new DefaultBotSsoExecutionActivityHandler(
      ssoConfig
    );
    const stub = sinon.stub(defaultBotSsoExecutionActivityHandler, "run").resolves();

    const middleware = new CommandResponseMiddleware(
      [],
      [testSsoCommand],
      defaultBotSsoExecutionActivityHandler
    );

    await middleware.onTurn(testContext as any, async () => {});
    expect(stub.called).to.be.true;
    expect(stub.calledOnceWith(testContext as any));
  });
});
