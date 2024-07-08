// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import "mocha";
import * as sinon from "sinon";
import * as util from "util";
import { teamsDevPortalClient } from "../../../../src/client/teamsDevPortalClient";
import * as localizeUtils from "../../../../src/common/localizeUtils";
import { CreateOrUpdateBotFrameworkBotDriver } from "../../../../src/component/driver/botFramework/createOrUpdateBot";
import { IBotRegistration } from "../../../../src/component/resource/botService/appStudio/interfaces/IBotRegistration";
import { InvalidActionInputError, UnhandledError } from "../../../../src/error/common";
import { MockedLogProvider, MockedM365Provider } from "../../../plugins/solution/util";

describe("CreateOrUpdateM365BotDriver", () => {
  const mockedDriverContext: any = {
    logProvider: new MockedLogProvider(),
    m365TokenProvider: new MockedM365Provider(),
  };
  const driver = new CreateOrUpdateBotFrameworkBotDriver();

  beforeEach(() => {
    sinon.stub(localizeUtils, "getDefaultString").callsFake((key, ...params) => {
      if (key === "error.yaml.InvalidActionInputError") {
        return util.format(
          "Following parameter is missing or invalid for %s action: %s.",
          ...params
        );
      } else if (key === "error.common.UnhandledError") {
        return util.format("Unhandled error happened in %s action: %s", ...params);
      } else if (key === "driver.botFramework.summary.create") {
        return util.format("The bot registration has been created successfully (%s).", ...params);
      } else if (key === "driver.botFramework.summary.update") {
        return util.format("The bot registration has been updated successfully (%s).", ...params);
      }
      return "";
    });
    sinon
      .stub(localizeUtils, "getLocalizedString")
      .callsFake((key, ...params) => localizeUtils.getDefaultString(key, ...params));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("run", () => {
    it("invalid args: missing botId", async () => {
      const args: any = {
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidActionInputError);
      }
    });

    it("invalid args: missing name", async () => {
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidActionInputError);
      }
    });

    it("invalid args: missing messagingEndpoint", async () => {
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidActionInputError);
      }
    });

    it("invalid args: description not string", async () => {
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        description: 123,
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidActionInputError);
      }
    });

    it("invalid args: iconUrl not string", async () => {
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        iconUrl: 123,
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidActionInputError);
      }
    });

    it("invalid args: channels not list", async () => {
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        channels: "channels",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidActionInputError);
      }
    });

    it("invalid args: channel name invalid", async () => {
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        channels: [
          {
            name: "name",
          },
        ],
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidActionInputError);
      }
    });

    it("invalid args: teams channel callingWebhook is not string", async () => {
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        channels: [
          {
            name: "msteams",
            callingWebhook: 123,
          },
        ],
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidActionInputError);
      }
    });

    it("exception", async () => {
      sinon.stub(teamsDevPortalClient, "getBotRegistration").throws(new Error("exception"));
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UnhandledError);
        const message = "Unhandled error happened in botFramework/create action: exception.";
        chai.assert(result.error.message, message);
      }
    });

    it("happy path: create", async () => {
      sinon.stub(teamsDevPortalClient, "getBotRegistration").returns(Promise.resolve(undefined));
      let createBotRegistrationCalled = false;
      sinon.stub(teamsDevPortalClient, "createBotRegistration").callsFake(async () => {
        createBotRegistrationCalled = true;
      });
      let updateBotRegistrationCalled = false;
      sinon.stub(teamsDevPortalClient, "updateBotRegistration").callsFake(async () => {
        updateBotRegistrationCalled = true;
      });
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        channels: [
          {
            name: "msteams",
            callingWebhook: "",
          },
          {
            name: "m365extensions",
          },
        ],
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isOk());
      chai.assert(createBotRegistrationCalled);
      chai.assert(!updateBotRegistrationCalled);
      if (result.isOk()) {
        chai.assert.equal(result.value.size, 0);
      }
    });

    it("happy path: update", async () => {
      const botRegistration: IBotRegistration = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        description: "",
        iconUrl: "",
        callingEndpoint: "",
      };
      sinon.stub(teamsDevPortalClient, "getBotRegistration").callsFake(async (token, botId) => {
        return botId === botRegistration.botId ? botRegistration : undefined;
      });
      let createBotRegistrationCalled = false;
      sinon.stub(teamsDevPortalClient, "createBotRegistration").callsFake(async () => {
        createBotRegistrationCalled = true;
      });
      let updateBotRegistrationCalled = false;
      sinon.stub(teamsDevPortalClient, "updateBotRegistration").callsFake(async () => {
        updateBotRegistrationCalled = true;
      });
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        description: "test-description",
        iconUrl: "test-iconUrl",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isOk());
      chai.assert(!createBotRegistrationCalled);
      chai.assert(updateBotRegistrationCalled);
      if (result.isOk()) {
        chai.assert.equal(result.value.size, 0);
      }
    });
  });

  describe("execute", () => {
    it("happy path: create", async () => {
      sinon.stub(teamsDevPortalClient, "getBotRegistration").returns(Promise.resolve(undefined));
      let createBotRegistrationCalled = false;
      sinon.stub(teamsDevPortalClient, "createBotRegistration").callsFake(async () => {
        createBotRegistrationCalled = true;
      });
      let updateBotRegistrationCalled = false;
      sinon.stub(teamsDevPortalClient, "updateBotRegistration").callsFake(async () => {
        updateBotRegistrationCalled = true;
      });
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
      };
      const executionResult = await driver.execute(args, mockedDriverContext);
      chai.assert(executionResult.result.isOk());
      chai.assert(createBotRegistrationCalled);
      chai.assert(!updateBotRegistrationCalled);
      if (executionResult.result.isOk()) {
        chai.assert.equal(executionResult.result.value.size, 0);
      }
      chai.assert.equal(executionResult.summaries.length, 1);
      chai.assert.equal(
        executionResult.summaries[0],
        "The bot registration has been created successfully (https://dev.botframework.com/bots?id=11111111-1111-1111-1111-111111111111)."
      );
    });

    it("happy path: update", async () => {
      const botRegistration: IBotRegistration = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        description: "",
        iconUrl: "",
        callingEndpoint: "",
      };
      sinon.stub(teamsDevPortalClient, "getBotRegistration").callsFake(async (token, botId) => {
        return botId === botRegistration.botId ? botRegistration : undefined;
      });
      let createBotRegistrationCalled = false;
      sinon.stub(teamsDevPortalClient, "createBotRegistration").callsFake(async () => {
        createBotRegistrationCalled = true;
      });
      let updateBotRegistrationCalled = false;
      sinon.stub(teamsDevPortalClient, "updateBotRegistration").callsFake(async () => {
        updateBotRegistrationCalled = true;
      });
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        description: "test-description",
        iconUrl: "test-iconUrl",
      };
      const executionResult = await driver.execute(args, mockedDriverContext);
      chai.assert(executionResult.result.isOk());
      chai.assert(!createBotRegistrationCalled);
      chai.assert(updateBotRegistrationCalled);
      if (executionResult.result.isOk()) {
        chai.assert.equal(executionResult.result.value.size, 0);
      }
      chai.assert.equal(executionResult.summaries.length, 1);
      chai.assert.equal(
        executionResult.summaries[0],
        "The bot registration has been updated successfully (https://dev.botframework.com/bots?id=11111111-1111-1111-1111-111111111111)."
      );
    });

    it("botId is not a valid GUID", async () => {
      const args: any = {
        botId: "test-bot-id",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        description: "test-description",
        iconUrl: "test-iconUrl",
      };
      const executionResult = await driver.execute(args, mockedDriverContext);
      chai.assert(executionResult.result.isErr());
      if (executionResult.result.isErr()) {
        chai.assert(executionResult.result.error.name === "InvalidBotId");
      }
    });
  });

  describe("undefined logger", () => {
    it("happy path: create", async () => {
      const contextWithoutLogger: any = {
        logProvider: undefined,
        m365TokenProvider: new MockedM365Provider(),
      };
      sinon.stub(teamsDevPortalClient, "getBotRegistration").returns(Promise.resolve(undefined));
      let createBotRegistrationCalled = false;
      sinon.stub(teamsDevPortalClient, "createBotRegistration").callsFake(async () => {
        createBotRegistrationCalled = true;
      });
      let updateBotRegistrationCalled = false;
      sinon.stub(teamsDevPortalClient, "updateBotRegistration").callsFake(async () => {
        updateBotRegistrationCalled = true;
      });
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
      };
      const executionResult = await driver.execute(args, contextWithoutLogger);
      chai.assert(executionResult.result.isOk());
      chai.assert(createBotRegistrationCalled);
      chai.assert(!updateBotRegistrationCalled);
    });

    it("happy path: update", async () => {
      const contextWithoutLogger: any = {
        logProvider: undefined,
        m365TokenProvider: new MockedM365Provider(),
      };
      const botRegistration: IBotRegistration = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        description: "",
        iconUrl: "",
        callingEndpoint: "",
      };
      sinon.stub(teamsDevPortalClient, "getBotRegistration").callsFake(async (token, botId) => {
        return botId === botRegistration.botId ? botRegistration : undefined;
      });
      let createBotRegistrationCalled = false;
      sinon.stub(teamsDevPortalClient, "createBotRegistration").callsFake(async () => {
        createBotRegistrationCalled = true;
      });
      let updateBotRegistrationCalled = false;
      sinon.stub(teamsDevPortalClient, "updateBotRegistration").callsFake(async () => {
        updateBotRegistrationCalled = true;
      });
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        description: "test-description",
        iconUrl: "test-iconUrl",
      };
      const executionResult = await driver.execute(args, contextWithoutLogger);
      chai.assert(executionResult.result.isOk());
      chai.assert(!createBotRegistrationCalled);
      chai.assert(updateBotRegistrationCalled);
    });
  });
});
