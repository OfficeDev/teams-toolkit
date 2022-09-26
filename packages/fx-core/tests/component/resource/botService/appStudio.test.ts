// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { AppStudio } from "../../../../src/component/resource/botService/appStudio/appStudio";
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

  describe("createAADAppV2", () => {
    it("Happy Path", async () => {
      // Arrange
      const accessToken = "anything";
      sinon.stub(RetryHandler, "Retry").resolves({
        data: {
          id: "anything",
          appId: "anything",
        },
      });

      // Act

      const result = await AppStudio.createAADAppV2(accessToken, {
        displayName: "anything",
      });

      chai.assert.isTrue(result.appId === "anything");
      chai.assert.isTrue(result.id === "anything");
    });

    it("Empty Data", async () => {
      // Arrange
      const accessToken = "anything";
      sinon.stub(RetryHandler, "Retry").resolves({});

      // Act
      try {
        await AppStudio.createAADAppV2(accessToken, {
          displayName: "anything",
        });
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }

      // Assert
      chai.assert.fail(Messages.ShouldNotReachHere);
    });
  });

  describe("createAADApp", () => {
    it("Happy Path", async () => {
      // Arrange
      const accessToken = "anything";
      sinon.stub(RetryHandler, "Retry").resolves({
        data: {
          id: "anything",
          objectId: "anything",
        },
      });

      // Act
      const result = await AppStudio.createAADApp(accessToken, {
        displayName: "anything",
      });

      chai.assert.isTrue(result.id === "anything");
      chai.assert.isTrue(result.objectId === "anything");
    });

    it("Empty Data", async () => {
      // Arrange
      const accessToken = "anything";
      sinon.stub(RetryHandler, "Retry").resolves({});

      // Act
      try {
        await AppStudio.createAADApp(accessToken, {
          displayName: "anything",
        });
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }

      // Assert
      chai.assert.fail(Messages.ShouldNotReachHere);
    });
  });

  describe("isAADAppExisting", () => {
    it("Happy Path", async () => {
      // Arrange
      const accessToken = "anything";
      sinon.stub(RetryHandler, "Retry").resolves({
        data: {
          id: "anything",
          appId: "anything",
        },
      });

      // Act
      const result = await AppStudio.isAADAppExisting(accessToken, "anything");

      // Assert
      chai.assert.isTrue(result);
    });

    it("Empty Data", async () => {
      // Arrange
      const accessToken = "anything";
      sinon.stub(RetryHandler, "Retry").resolves({});

      // Act
      const result = await AppStudio.isAADAppExisting(accessToken, "anything");

      // Assert
      chai.assert.isFalse(result);
    });
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
        await AppStudio.createBotRegistration(accessToken, botReg);
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
        await AppStudio.createBotRegistration(accessToken, botReg);
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
      sinon.stub(AppStudio, "getBotRegistration").resolves({
        name: "",
        description: "",
        iconUrl: "",
        messagingEndpoint: "",
        callingEndpoint: "",
      });

      // Act
      try {
        await AppStudio.updateMessageEndpoint(accessToken, "anything", "anything");
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
        await AppStudio.updateMessageEndpoint(accessToken, "anything", "");
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
      sinon.stub(AppStudio, "getBotRegistration").resolves({
        name: "",
        description: "",
        iconUrl: "",
        messagingEndpoint: "",
        callingEndpoint: "",
      });

      sinon.stub(RetryHandler, "Retry").throwsException();

      // Act
      try {
        await AppStudio.updateMessageEndpoint(accessToken, "anything", "anything");
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
        await AppStudio.getBotRegistration("", "anything");
      } catch (e) {
        chai.assert.isTrue(e instanceof UserError);
        return;
      }
    });

    it("Get Bot Exception", async () => {
      // Arrange
      const accessToken = "anything";
      sinon.stub(AppStudio, "getBotRegistration").resolves({
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
        await AppStudio.getBotRegistration(accessToken, "anything");
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }
    });
  });
});
