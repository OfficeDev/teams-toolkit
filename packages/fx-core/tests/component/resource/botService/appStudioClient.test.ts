// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { M365TokenProvider, ok, ResourceContextV3, TokenRequest } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { createSandbox } from "sinon";
import * as utils from "../../../../src/component/utils";
import { setTools } from "../../../../src/core/globalVars";
import { MockTools } from "../../../core/utils";
import { newEnvInfoV3 } from "../../../../src/core/environment";
import { AppStudioClient } from "../../../../src/component/resource/botService/appStudio/appStudioClient";
import { IBotRegistration } from "../../../../src/component/resource/botService/appStudio/interfaces/IBotRegistration";
import { RetryHandler } from "../../../../src/component/resource/botService/retryHandler";
import axios from "axios";
import { ErrorNames } from "../../../../src/component/resource/botService/constants";
import { Messages } from "./messages";
import { AppStudioError } from "../../../../src/component/resource/appManifest/errors";

describe("AppStudio Client", () => {
  const tools = new MockTools();
  const sandbox = createSandbox();
  let context: ResourceContextV3;
  setTools(tools);
  beforeEach(() => {
    context = utils.createContextV3() as ResourceContextV3;
    context.tokenProvider.m365TokenProvider = {
      getAccessToken: async (tokenRequest: TokenRequest) => ok("token"),
    } as M365TokenProvider;
    context.envInfo = newEnvInfoV3("local");
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("getBotRegistration", () => {
    it("Should return a valid bot registration", async () => {
      // Arrange
      const sampleBot: IBotRegistration = {
        botId: "0cd14903-d43a-47f5-b907-73c523aff076",
        name: "ruhe01290236-local-debug",
        description: "",
        iconUrl:
          "https://docs.botframework.com/static/devportal/client/images/bot-framework-default.png",
        messagingEndpoint: "https://8075-167-220-255-43.ngrok.io/api/messages",
        callingEndpoint: "",
      };
      sandbox.stub(RetryHandler, "Retry").resolves(sampleBot);
      // Act
      const res = await AppStudioClient.getBotRegistration("anything", "anything");

      // Assert
      assert.isTrue(res !== undefined);
      assert.isTrue(res?.botId === sampleBot.botId);
    });

    it("Should return a undefined when 404 was throwed out", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "get").rejects({
        response: {
          status: 404,
        },
      });
      sandbox.stub(AppStudioClient, "newAxiosInstance").returns(mockAxiosInstance);

      // Act
      const res = await AppStudioClient.getBotRegistration("anything", "anything");

      // Assert
      assert.isUndefined(res);
    });

    it("Should throw NotAllowedToAcquireToken error when 401 was throwed out", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "get").rejects({
        response: {
          status: 401,
        },
      });
      sandbox.stub(AppStudioClient, "newAxiosInstance").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await AppStudioClient.getBotRegistration("anything", "anything");
        assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        assert.isTrue(e.name === ErrorNames.ACQUIRE_BOT_FRAMEWORK_TOKEN_ERROR);
      }
    });

    it("Should throw DeveloperPortalAPIFailed error when other exceptions (500) were throwed out", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "get").rejects({
        response: {
          status: 500,
        },
      });
      sandbox.stub(AppStudioClient, "newAxiosInstance").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await AppStudioClient.getBotRegistration("anything", "anything");
        assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        assert.isTrue(e.name === AppStudioError.DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("createBotRegistration", () => {});

  describe("updateBotRegistration", () => {});

  describe("updateMessageEndpoint", () => {});
});
