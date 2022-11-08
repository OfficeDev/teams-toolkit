// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import * as sinon from "sinon";
import * as util from "util";

import * as localizeUtils from "../../../../src/common/localizeUtils";
import { BotRegistrationNotFoundError } from "../../../../src/component/driver/m365Bot/error/botRegistrationNotFoundError";
import { InvalidParameterUserError } from "../../../../src/component/driver/m365Bot/error/invalidParameterUserError";
import { UnhandledSystemError } from "../../../../src/component/driver/m365Bot/error/unhandledError";
import { UpdateM365BotDriver } from "../../../../src/component/driver/m365Bot/update";
import { AppStudioClient } from "../../../../src/component/resource/botService/appStudio/appStudioClient";
import { IBotRegistration } from "../../../../src/component/resource/botService/appStudio/interfaces/IBotRegistration";
import { MockedLogProvider, MockedM365Provider } from "../../../plugins/solution/util";

describe("CreateM365BotDriver", () => {
  const mockedDriverContext: any = {
    logProvider: new MockedLogProvider(),
    m365TokenProvider: new MockedM365Provider(),
  };
  const driver = new UpdateM365BotDriver();

  beforeEach(() => {
    sinon.stub(localizeUtils, "getDefaultString").callsFake((key, ...params) => {
      if (key === "driver.m365Bot.error.invalidParameter") {
        return util.format(
          "Following parameter is missing or invalid for %s action: %s.",
          ...params
        );
      } else if (key === "driver.m365Bot.error.unhandledError") {
        return util.format("Unhandled error happened in %s action: %s", ...params);
      } else if (key === "driver.m365Bot.error.botRegistrationNotFound") {
        return util.format("Bot registration is not found with botId %s.", ...params);
      }
      return "";
    });
    sinon.stub(localizeUtils, "getLocalizedString").returns("");
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("run", () => {
    it("invalid args: missing botId", async () => {
      const args: any = {
        messagingEndpoint: "https://test.ngrok.io/api/messages",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidParameterUserError);
        const message =
          "Following parameter is missing or invalid for m365Bot/update action: botId.";
        chai.assert.equal(result.error.message, message);
      }
    });

    it("invalid args: missing messagingEndpoint", async () => {
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidParameterUserError);
        const message =
          "Following parameter is missing or invalid for m365Bot/update action: messagingEndpoint.";
        chai.assert.equal(result.error.message, message);
      }
    });

    it("invalid args: name not string", async () => {
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        name: 123,
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidParameterUserError);
        const message =
          "Following parameter is missing or invalid for m365Bot/update action: name.";
        chai.assert.equal(result.error.message, message);
      }
    });

    it("invalid args: description not string", async () => {
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        description: 123,
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidParameterUserError);
        const message =
          "Following parameter is missing or invalid for m365Bot/update action: description.";
        chai.assert.equal(result.error.message, message);
      }
    });

    it("invalid args: iconUrl not string", async () => {
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
        iconUrl: 123,
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidParameterUserError);
        const message =
          "Following parameter is missing or invalid for m365Bot/update action: iconUrl.";
        chai.assert.equal(result.error.message, message);
      }
    });

    it("exception", async () => {
      sinon.stub(AppStudioClient, "getBotRegistration").throws(new Error("exception"));
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UnhandledSystemError);
        const message = "Unhandled error happened in m365Bot/update action: exception.";
        chai.assert(result.error.message, message);
      }
    });

    it("bot not found", async () => {
      sinon.stub(AppStudioClient, "getBotRegistration").returns(Promise.resolve(undefined));
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
        messagingEndpoint: "https://test.ngrok.io/api/messages",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof BotRegistrationNotFoundError);
        const message = `Bot registration is not found with botId ${args.botId}.`;
        chai.assert(result.error.message, message);
      }
    });

    it("happy path", async () => {
      const botRegistration: IBotRegistration = {
        botId: "11111111-1111-1111-1111-111111111111",
        name: "test-bot",
        messagingEndpoint: "",
        description: "",
        iconUrl: "",
        callingEndpoint: "",
      };
      sinon.stub(AppStudioClient, "getBotRegistration").callsFake(async (token, botId) => {
        return botId === botRegistration.botId ? botRegistration : undefined;
      });
      let called = false;
      sinon.stub(AppStudioClient, "updateBotRegistration").callsFake(async () => {
        called = true;
      });
      const args: any = {
        botId: botRegistration.botId,
        messagingEndpoint: "https://test.ngrok.io/api/messages",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isOk());
      chai.assert(called);
      if (result.isOk()) {
        chai.assert.equal(result.value.size, 0);
      }
    });
  });
});
