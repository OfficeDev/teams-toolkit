import { assert } from "chai";
import { BotFrameworkAdapter, ConversationReference, TurnContext } from "botbuilder";
import * as sinon from "sinon";
import { CardActionBot } from "../../../../src/conversation/cardAction";
import { CardActionMiddleware } from "../../../../src/conversation/middlewares/cardActionMiddleware";
import { MockActionInvokeContext, TestCardActionHandler } from "./testUtils";

describe("Card Action Handler - Node", () => {
  it("handler should send text message response correctly", async () => {
    const doStuffAction = new TestCardActionHandler("doStuff", "sample-response");
    const testContext = new MockActionInvokeContext("doStuff");
    const middleware = new CardActionMiddleware([doStuffAction]);
    await middleware.onTurn(testContext as any, async () => {});

    assert.isTrue(doStuffAction.isInvoked);
    assert.strictEqual(testContext.message, "sample-response");
  });

  it("handler should send adaptive card response correctly", async () => {
    const responseCard = {
      version: "1.0.0",
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          text: `Hello World!`,
        },
      ],
    };

    const doStuffAction = new TestCardActionHandler("doStuff", responseCard);
    const testContext = new MockActionInvokeContext("doStuff");
    const middleware = new CardActionMiddleware([doStuffAction]);
    await middleware.onTurn(testContext as any, async () => {});

    assert.isTrue(doStuffAction.isInvoked);
    assert.deepEqual(testContext.message, responseCard);
  });

  it("handler should send default response if no return value", async () => {
    const doStuffAction = new TestCardActionHandler("doStuff");
    const testContext = new MockActionInvokeContext("doStuff");
    const middleware = new CardActionMiddleware([doStuffAction]);
    await middleware.onTurn(testContext as any, async () => {});

    assert.isTrue(doStuffAction.isInvoked);
    assert.strictEqual(testContext.message, "Your response was sent to the app");
  });

  it("handler should get action data correctly", async () => {
    const doStuffAction = new TestCardActionHandler("doStuff", "myResponseMessage");
    const testContext = new MockActionInvokeContext("doStuff", { foo: "bar" });
    const middleware = new CardActionMiddleware([doStuffAction]);
    await middleware.onTurn(testContext as any, async () => {});

    assert.isTrue(doStuffAction.isInvoked);
    assert.deepEqual(doStuffAction.actionData, { foo: "bar" });
  });
});

describe("ard Action Bot Tests - Node", () => {
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

  it("initialize cardAction should create correct middleware", () => {
    const cardAction = new CardActionBot(adapter);
    assert.strictEqual(middlewares.length, 1);
    assert.isTrue(middlewares[0] instanceof CardActionMiddleware);
  });

  it("registerHandler should add card action successfully", () => {
    const cardAction = new CardActionBot(adapter);
    cardAction.registerHandler(new TestCardActionHandler("myAction"));

    assert.strictEqual(middlewares.length, 1);
    assert.isTrue(middlewares[0] instanceof CardActionMiddleware);
    const middleware = middlewares[0] as CardActionMiddleware;

    assert.isNotEmpty(middleware.actionHandlers);
    assert.isTrue(middleware.actionHandlers.length === 1);
    assert.isTrue(middleware.actionHandlers[0] instanceof TestCardActionHandler);
  });

  it("registerHandlers should add card actions successfully", () => {
    const cardAction = new CardActionBot(adapter);
    cardAction.registerHandlers([
      new TestCardActionHandler("myAction1"),
      new TestCardActionHandler("myAction2"),
    ]);

    assert.strictEqual(middlewares.length, 1);
    assert.isTrue(middlewares[0] instanceof CardActionMiddleware);
    const middleware = middlewares[0] as CardActionMiddleware;

    assert.isNotEmpty(middleware.actionHandlers);
    assert.isTrue(middleware.actionHandlers.length === 2);
    assert.isTrue(middleware.actionHandlers[0] instanceof TestCardActionHandler);
    assert.isTrue(middleware.actionHandlers[0].triggerVerb == "myAction1");
    assert.isTrue(middleware.actionHandlers[1] instanceof TestCardActionHandler);
    assert.isTrue(middleware.actionHandlers[1].triggerVerb == "myAction2");
  });
});
