// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";

import { AADRegistration } from "../../../../src/component/resource/botService/aadRegistration";
import {
  CreateAADAppError,
  PluginError,
} from "../../../../src/component/resource/botService/errors";
import { default as axios } from "axios";
import { RetryHandler } from "../../../../src/component/resource/botService/retryHandler";
import { Messages } from "./messages";
import { AppStudio } from "../../../../src/component/resource/botService/appStudio/appStudio";
import { BotAuthCredential } from "../../../../src/component/resource/botService/botAuthCredential";
import { CommonStrings } from "../../../../src/component/resource/botService/strings";
import {
  CreateAppError,
  CreateSecretError,
} from "../../../../src/component/resource/aadApp/errors";

describe("AAD Registration", () => {
  describe("registerAADAppAndGetSecretByGraph", () => {
    afterEach(async () => {
      sinon.restore();
    });
    it("Invalid Graph Token", async () => {
      // Arrange
      const graphToken = "some ivalid graph token";
      const displayName = "invalidGraphToken";

      sinon.stub(RetryHandler, "Retry").throws(new CreateAADAppError());
      // Act
      try {
        await AADRegistration.registerAADAppAndGetSecretByGraph(graphToken, displayName);
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }

      chai.assert.isTrue(false);
    });

    it("Happy Path", async () => {
      // Arrange
      const graphToken = "anything";
      const displayName = "any name";

      const fakeAxiosInstance = axios.create();
      sinon.stub(fakeAxiosInstance, "post").resolves({
        status: 200,
        data: {
          appId: "appId",
          id: "id",
          secretText: "secretText",
        },
      });
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      // Act
      const result = await AADRegistration.registerAADAppAndGetSecretByGraph(
        graphToken,
        displayName
      );

      // Assert
      chai.assert.isTrue(result.clientId === "appId");
      chai.assert.isTrue(result.objectId === "id");
      chai.assert.isTrue(result.clientSecret === "secretText");
    });

    it("Create aad app invalid", async () => {
      // Arrange
      const graphToken = "anything";
      const displayName = "any name";

      const fakeAxiosInstance = axios.create();
      sinon.stub(fakeAxiosInstance, "post").resolves({
        status: 500,
      });
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      // Act
      try {
        await AADRegistration.registerAADAppAndGetSecretByGraph(graphToken, displayName);
      } catch (e) {
        chai.assert.equal(e.name, "ProvisionError");
        chai.assert.include(e.message, CommonStrings.AAD_APP);
        return;
      }
      chai.assert.fail(Messages.ShouldNotReachHere);
    });

    it("Create aad app error", async () => {
      // Arrange
      const graphToken = "anything";
      const displayName = "any name";
      sinon.stub(RetryHandler, "Retry").throws(new CreateAADAppError());

      // Act
      try {
        await AADRegistration.registerAADAppAndGetSecretByGraph(graphToken, displayName);
      } catch (e) {
        chai.assert.equal(e.name, CreateAppError.name);
        return;
      }
      chai.assert.fail(Messages.ShouldNotReachHere);
    });

    it("Create aad app undefined", async () => {
      // Arrange
      const graphToken = "anything";
      const displayName = "any name";
      sinon.stub(RetryHandler, "Retry").resolves(undefined);

      // Act
      try {
        await AADRegistration.registerAADAppAndGetSecretByGraph(graphToken, displayName);
      } catch (e) {
        chai.assert.equal(e.name, "ProvisionError");
        chai.assert.include(e.message, CommonStrings.AAD_APP);
        return;
      }
      chai.assert.fail(Messages.ShouldNotReachHere);
    });

    it("Use existing aad", async () => {
      // Arrange
      const graphToken = "anything";
      const displayName = "any name";

      const fakeAxiosInstance = axios.create();
      sinon.stub(fakeAxiosInstance, "post").resolves({
        status: 200,
        data: {
          appId: "appId",
          id: "id",
          secretText: "secretText",
        },
      });
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      // Act
      const result = await AADRegistration.registerAADAppAndGetSecretByGraph(
        graphToken,
        displayName,
        "objectId",
        "msAppId"
      );

      // Assert
      chai.assert.isTrue(result.clientId === "msAppId");
      chai.assert.isTrue(result.objectId === "objectId");
      chai.assert.isTrue(result.clientSecret === "secretText");
    });

    it("Create secret error", async () => {
      // Arrange
      const graphToken = "anything";
      const displayName = "any name";

      sinon.stub(RetryHandler, "Retry").throws(new CreateAADAppError());
      // Act
      try {
        await AADRegistration.registerAADAppAndGetSecretByGraph(
          graphToken,
          displayName,
          "objectId",
          "msAppId"
        );
      } catch (e) {
        chai.assert.equal(e.name, CreateSecretError.name);
        return;
      }
      chai.assert.fail(Messages.ShouldNotReachHere);
    });

    it("Create secret undefined", async () => {
      // Arrange
      const graphToken = "anything";
      const displayName = "any name";

      const fakeAxiosInstance = axios.create();
      sinon.stub(fakeAxiosInstance, "post").resolves(undefined);
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      // Act
      try {
        await AADRegistration.registerAADAppAndGetSecretByGraph(
          graphToken,
          displayName,
          "objectId",
          "msAppId"
        );
      } catch (e) {
        chai.assert.equal(e.name, "ProvisionError");
        chai.assert.include(e.message, CommonStrings.AAD_CLIENT_SECRET);
        return;
      }
      chai.assert.fail(Messages.ShouldNotReachHere);
    });

    it("Create secret invalid", async () => {
      // Arrange
      const graphToken = "anything";
      const displayName = "any name";

      const fakeAxiosInstance = axios.create();
      sinon.stub(fakeAxiosInstance, "post").resolves({
        status: 200,
      });
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      // Act
      try {
        await AADRegistration.registerAADAppAndGetSecretByGraph(
          graphToken,
          displayName,
          "objectId",
          "msAppId"
        );
      } catch (e) {
        chai.assert.equal(e.name, "ProvisionError");
        chai.assert.include(e.message, CommonStrings.AAD_CLIENT_SECRET);
        return;
      }
      chai.assert.fail(Messages.ShouldNotReachHere);
    });
  });

  describe("registerAADAppAndGetSecretByAppStudio", () => {
    afterEach(async () => {
      sinon.restore();
    });
    it("Happy Path", async () => {
      // Arrange
      const appStudioToken = "some invalid app studio token";
      const displayName = "invalidAppStudioToken";
      sinon.stub(AppStudio, "createAADAppPassword").resolves({ value: "password" });
      sinon.stub(AppStudio, "createAADAppV2").resolves({ appId: "msAppId", id: "objectId" });

      // Act
      const res = await AADRegistration.registerAADAppAndGetSecretByAppStudio(
        appStudioToken,
        displayName
      );
      chai.assert.equal(res.clientId, "msAppId");
      chai.assert.equal(res.objectId, "objectId");
      chai.assert.equal(res.clientSecret, "password");
    });
    it("Create aad secret undefined", async () => {
      // Arrange
      const appStudioToken = "some invalid app studio token";
      const displayName = "invalidAppStudioToken";
      sinon.stub(AppStudio, "createAADAppPassword").resolves(undefined);
      sinon.stub(AppStudio, "createAADAppV2").resolves({ appId: "msAppId", id: "objectId" });

      // Act
      try {
        await AADRegistration.registerAADAppAndGetSecretByAppStudio(appStudioToken, displayName);
      } catch (e) {
        chai.assert.equal(e.name, "ProvisionError");
        chai.assert.include(e.message, CommonStrings.AAD_CLIENT_SECRET);
        return;
      }
      chai.assert.fail(Messages.ShouldNotReachHere);
    });
    it("Create aad secret invalid", async () => {
      // Arrange
      const appStudioToken = "some invalid app studio token";
      const displayName = "invalidAppStudioToken";
      sinon.stub(AppStudio, "createAADAppPassword").resolves({} as any);
      sinon.stub(AppStudio, "createAADAppV2").resolves({ appId: "msAppId", id: "objectId" });

      // Act
      try {
        await AADRegistration.registerAADAppAndGetSecretByAppStudio(appStudioToken, displayName);
      } catch (e) {
        chai.assert.equal(e.name, "ProvisionError");
        chai.assert.include(e.message, CommonStrings.AAD_CLIENT_SECRET);
        return;
      }
      chai.assert.fail(Messages.ShouldNotReachHere);
    });
    it("Use existing aad", async () => {
      // Arrange
      const appStudioToken = "some invalid app studio token";
      const displayName = "invalidAppStudioToken";
      sinon.stub(AppStudio, "createAADAppPassword").resolves({ value: "password" });

      let res: BotAuthCredential;
      // Act
      try {
        res = await AADRegistration.registerAADAppAndGetSecretByAppStudio(
          appStudioToken,
          displayName,
          "objectId",
          "msAppId"
        );
      } catch (e) {
        chai.assert.fail(Messages.ShouldNotReachHere);
      }
      chai.assert.equal(res.clientId, "msAppId");
      chai.assert.equal(res.objectId, "objectId");
      chai.assert.equal(res.clientSecret, "password");
    });
    it("Invalid App Studio Token", async () => {
      // Arrange
      const appStudioToken = "some invalid app studio token";
      const displayName = "invalidAppStudioToken";

      sinon.stub(RetryHandler, "Retry").throws(new CreateAADAppError());

      // Act
      try {
        await AADRegistration.registerAADAppAndGetSecretByAppStudio(appStudioToken, displayName);
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }

      chai.assert.fail(Messages.ShouldNotReachHere);
    });
  });
});
