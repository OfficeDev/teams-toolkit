// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import * as sinon from "sinon";
import * as util from "util";

import * as localizeUtils from "../../../../src/common/localizeUtils";
import { CreateM365BotDriver } from "../../../../src/component/driver/m365Bot/create";
import { InvalidParameterUserError } from "../../../../src/component/driver/m365Bot/error/invalidParameterUserError";
import { UnhandledSystemError } from "../../../../src/component/driver/m365Bot/error/unhandledError";
import { AppStudioClient } from "../../../../src/component/resource/botService/appStudio/appStudioClient";
import { MockedLogProvider, MockedM365Provider } from "../../../plugins/solution/util";

describe("CreateM365BotDriver", () => {
  const mockedDriverContext: any = {
    logProvider: new MockedLogProvider(),
    m365TokenProvider: new MockedM365Provider(),
  };
  const driver = new CreateM365BotDriver();

  beforeEach(() => {
    sinon.stub(localizeUtils, "getDefaultString").callsFake((key, ...params) => {
      if (key === "driver.m365Bot.error.invalidParameter") {
        return util.format(
          "Following parameter is missing or invalid for %s action: %s.",
          ...params
        );
      } else if (key === "driver.m365Bot.error.unhandledError") {
        return util.format("Unhandled error happened in %s action: %s", ...params);
      }
      return "";
    });
    sinon.stub(localizeUtils, "getLocalizedString").returns("");
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("run", () => {
    it("invalid args: missing name", async () => {
      const args: any = {
        botId: "11111111-1111-1111-1111-111111111111",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidParameterUserError);
        const message =
          "Following parameter is missing or invalid for m365Bot/create action: name.";
        chai.assert.equal(result.error.message, message);
      }
    });

    it("invalid args: missing botId", async () => {
      const args: any = {
        name: "test-bot",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidParameterUserError);
        const message =
          "Following parameter is missing or invalid for m365Bot/create action: botId.";
        chai.assert.equal(result.error.message, message);
      }
    });

    it("exception", async () => {
      sinon.stub(AppStudioClient, "createBotRegistration").throws(new Error("exception"));
      const args: any = {
        name: "test-bot",
        botId: "11111111-1111-1111-1111-111111111111",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UnhandledSystemError);
        const message = "Unhandled error happened in m365Bot/create action: exception.";
        chai.assert(result.error.message, message);
      }
    });

    it("happy path", async () => {
      sinon.stub(AppStudioClient, "createBotRegistration").callsFake(async () => {});
      const args: any = {
        name: "test-bot",
        botId: "11111111-1111-1111-1111-111111111111",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isOk());
      if (result.isOk()) {
        chai.assert.equal(result.value.size, 0);
      }
    });
  });
});
