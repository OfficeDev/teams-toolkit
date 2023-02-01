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
import { ErrorNames, Retry } from "../../../../src/component/resource/botService/constants";
import { Messages } from "./messages";
import { AppStudioError } from "../../../../src/component/resource/appManifest/errors";

describe("AppStudio Client", () => {
  const tools = new MockTools();
  const sandbox = createSandbox();
  let context: ResourceContextV3;
  setTools(tools);
  const sampleBot: IBotRegistration = {
    botId: "0cd14903-d43a-47f5-b907-73c523aff076",
    name: "ruhe01290236-local-debug",
    description: "",
    iconUrl:
      "https://docs.botframework.com/static/devportal/client/images/bot-framework-default.png",
    messagingEndpoint: "https://8075-167-220-255-43.ngrok.io/api/messages",
    callingEndpoint: "",
  };
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
      sandbox.stub(RetryHandler, "Retry").resolves({
        data: sampleBot,
      });
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
      sandbox.stub(RetryHandler, "Retry").resolves({
        headers: {
          "x-correlation-id": "anything",
        },
        status: 500,
      });

      // Act & Assert
      try {
        await AppStudioClient.getBotRegistration("anything", "anything");
        assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        assert.isTrue(e.name === AppStudioError.DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("createBotRegistration", () => {
    it("Bot registration should be created successfully", async () => {
      // Arrange
      sandbox.stub(AppStudioClient, "getBotRegistration").resolves(undefined);
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").resolves({
        status: 200,
        data: sampleBot,
      });
      sandbox.stub(AppStudioClient, "newAxiosInstance").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await AppStudioClient.createBotRegistration("anything", sampleBot, context);
      } catch (e) {
        assert.fail(Messages.ShouldNotReachHere);
      }
    });

    it("Bot registration creation should be skipped (existing bot case).", async () => {
      // Arrange
      sandbox.stub(AppStudioClient, "getBotRegistration").resolves(sampleBot);

      // Act & Assert
      try {
        await AppStudioClient.createBotRegistration("anything", sampleBot, context);
      } catch (e) {
        assert.fail(Messages.ShouldNotReachHere);
      }
    });

    it("BotFrameworkNotAllowedToAcquireToken error should be throwed out (401)", async () => {
      // Arrange
      sandbox.stub(AppStudioClient, "getBotRegistration").resolves(undefined);
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").rejects({
        response: {
          status: 401,
        },
      });
      sandbox.stub(AppStudioClient, "newAxiosInstance").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await AppStudioClient.createBotRegistration("anything", sampleBot, context);
        assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        assert.isTrue(e.name === ErrorNames.ACQUIRE_BOT_FRAMEWORK_TOKEN_ERROR);
      }
    });

    it("BotFrameworkForbiddenResult error should be throwed out (403)", async () => {
      // Arrange
      sandbox.stub(AppStudioClient, "getBotRegistration").resolves(undefined);
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").rejects({
        response: {
          status: 403,
        },
      });
      sandbox.stub(AppStudioClient, "newAxiosInstance").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await AppStudioClient.createBotRegistration("anything", sampleBot, context);
        assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        assert.isTrue(e.name === ErrorNames.FORBIDDEN_RESULT_BOT_FRAMEWORK_ERROR);
      }
    });

    it("BotFrameworkConflictResult error should be throwed out (429)", async () => {
      // Arrange
      sandbox.stub(AppStudioClient, "getBotRegistration").resolves(undefined);
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").rejects({
        response: {
          status: 429,
        },
      });
      sandbox.stub(AppStudioClient, "newAxiosInstance").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await AppStudioClient.createBotRegistration("anything", sampleBot, context);
        assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        assert.isTrue(e.name === ErrorNames.CONFLICT_RESULT_BOT_FRAMEWORK_ERROR);
      }
    });

    it("DeveloperPortalAPIFailed error should be throwed out (500)", async () => {
      // Arrange
      sandbox.stub(AppStudioClient, "getBotRegistration").resolves(undefined);
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").resolves({
        status: 500,
      });
      sandbox.stub(AppStudioClient, "newAxiosInstance").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await AppStudioClient.createBotRegistration("anything", sampleBot, context);
        assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        assert.isTrue(e.name === AppStudioError.DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("updateBotRegistration", () => {
    it("Bot registration should be updated successfully", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").resolves({
        status: 200,
        data: sampleBot,
      });
      sandbox.stub(AppStudioClient, "newAxiosInstance").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await AppStudioClient.updateBotRegistration("anything", sampleBot);
      } catch (e) {
        assert.fail(Messages.ShouldNotReachHere);
      }
    });

    it("BotFrameworkNotAllowedToAcquireToken error should be throwed out (401)", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").rejects({
        response: {
          status: 401,
        },
      });
      sandbox.stub(AppStudioClient, "newAxiosInstance").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await AppStudioClient.updateBotRegistration("anything", sampleBot);
        assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        assert.isTrue(e.name === ErrorNames.ACQUIRE_BOT_FRAMEWORK_TOKEN_ERROR);
      }
    });

    it("BotFrameworkForbiddenResult error should be throwed out (403)", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").rejects({
        response: {
          status: 403,
        },
      });
      sandbox.stub(AppStudioClient, "newAxiosInstance").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await AppStudioClient.updateBotRegistration("anything", sampleBot);
        assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        assert.isTrue(e.name === ErrorNames.FORBIDDEN_RESULT_BOT_FRAMEWORK_ERROR);
      }
    });

    it("BotFrameworkConflictResult error should be throwed out (429)", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").rejects({
        response: {
          status: 429,
        },
      });
      sandbox.stub(AppStudioClient, "newAxiosInstance").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await AppStudioClient.updateBotRegistration("anything", sampleBot);
        assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        assert.isTrue(e.name === ErrorNames.CONFLICT_RESULT_BOT_FRAMEWORK_ERROR);
      }
    });

    it("DeveloperPortalAPIFailed error should be throwed out (500)", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").resolves({
        status: 500,
      });
      sandbox.stub(AppStudioClient, "newAxiosInstance").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await AppStudioClient.updateBotRegistration("anything", sampleBot);
        assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        assert.isTrue(e.name === AppStudioError.DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("updateMessageEndpoint", () => {
    it("Message endpoint should be updated successfully", async () => {
      // Arrange
      sandbox.stub(AppStudioClient, "getBotRegistration").resolves(sampleBot);
      sandbox.stub(AppStudioClient, "updateBotRegistration").resolves();
      // Act & Assert
      try {
        await AppStudioClient.updateMessageEndpoint("anything", "anything", "anything");
      } catch (e) {
        assert.fail(Messages.ShouldNotReachHere);
      }
    });

    it("BotRegistrationNotFound error should be throwed out", async () => {
      // Arrange
      sandbox.stub(AppStudioClient, "getBotRegistration").resolves(undefined);
      // Act & Assert
      try {
        await AppStudioClient.updateMessageEndpoint("anything", "anything", "anything");
        assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        assert.isTrue(e.name === ErrorNames.BOT_REGISTRATION_NOTFOUND_ERROR);
      }
    });
  });
});
