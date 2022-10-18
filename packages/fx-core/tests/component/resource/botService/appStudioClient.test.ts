// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { AppStudioClient } from "../../../../src/component/resource/botService/appStudio/appStudioClient";
import { RetryHandler } from "../../../../src/component/resource/botService/retryHandler";
import * as sinon from "sinon";
import { IBotRegistration } from "../../../../src/component/resource/botService/appStudio/interfaces/IBotRegistration";
import { PluginError } from "../../../../src/component/resource/botService/errors";
import { Messages } from "./messages";
import { UserError } from "@microsoft/teamsfx-api";

describe("Test AppStudio APIs", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("createBotRegistration", () => {
    it("Happy Path", async () => {
      // Arrange
      const accessToken = "anything";
      const botReg: IBotRegistration = {
        botId: "anything",
        name: "anything",
        description: "",
        iconUrl: "",
        messagingEndpoint: "",
        callingEndpoint: "",
      };

      sinon.stub(RetryHandler, "Retry").resolves({
        data: {},
      });

      // Act
      try {
        await AppStudioClient.createBotRegistration(botReg, accessToken);
      } catch {
        chai.assert.fail(Messages.ShouldNotReachHere);
      }
    });

    it("Empty Data", async () => {
      // Arrange
      const accessToken = "anything";
      const botReg: IBotRegistration = {
        botId: "anything",
        name: "anything",
        description: "",
        iconUrl: "",
        messagingEndpoint: "",
        callingEndpoint: "",
      };

      sinon.stub(RetryHandler, "Retry").resolves({});

      // Act
      try {
        await AppStudioClient.createBotRegistration(botReg, accessToken);
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }

      // Assert
      chai.assert.fail(Messages.ShouldNotReachHere);
    });
  });

  describe("updateMessageEndpoint", () => {
    it("Happy Path", async () => {
      // Arrange
      const accessToken = "anything";

      sinon.stub(RetryHandler, "Retry").resolves({
        data: {},
      });
      sinon.stub(AppStudioClient, "getBotRegistration").resolves({
        name: "",
        description: "",
        iconUrl: "",
        messagingEndpoint: "",
        callingEndpoint: "",
      });

      // Act
      try {
        await AppStudioClient.updateMessageEndpoint(accessToken, "anything", "anything");
      } catch {
        chai.assert.fail(Messages.ShouldNotReachHere);
      }
    });

    it("Empty Data", async () => {
      // Arrange
      const accessToken = "anything";

      sinon.stub(RetryHandler, "Retry").resolves({});

      // Act
      try {
        await AppStudioClient.updateMessageEndpoint(accessToken, "anything", "");
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }

      // Assert
      chai.assert.fail(Messages.ShouldNotReachHere);
    });

    it("Retry Exception", async () => {
      // Arrange
      const accessToken = "anything";
      sinon.stub(AppStudioClient, "getBotRegistration").resolves({
        name: "",
        description: "",
        iconUrl: "",
        messagingEndpoint: "",
        callingEndpoint: "",
      });

      sinon.stub(RetryHandler, "Retry").throwsException();

      // Act
      try {
        await AppStudioClient.updateMessageEndpoint(accessToken, "anything", "anything");
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }

      // Assert
      chai.assert.fail(Messages.ShouldNotReachHere);
    });
  });

  describe("getBotRegistration", () => {
    it("Empty Access Token", async () => {
      // Act
      try {
        await AppStudioClient.getBotRegistration("", "anything");
      } catch (e) {
        chai.assert.isTrue(e instanceof UserError);
        return;
      }
    });

    it("Get Bot Exception", async () => {
      // Arrange
      const accessToken = "anything";
      sinon.stub(AppStudioClient, "getBotRegistration").resolves({
        name: "",
        description: "",
        iconUrl: "",
        messagingEndpoint: "",
        callingEndpoint: "",
      });

      const error = {
        response: {
          status: 500,
          message: "errorMessage",
        },
      };
      sinon
        .stub(RetryHandler, "Retry")
        .callsFake(async (fn: () => unknown, ignoreError = false) => {
          throw error;
        });

      // Act
      try {
        await AppStudioClient.getBotRegistration(accessToken, "anything");
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }
    });
  });
});
