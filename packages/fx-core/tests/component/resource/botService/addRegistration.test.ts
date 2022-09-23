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
  });

  describe("registerAADAppAndGetSecretByAppStudio", () => {
    afterEach(async () => {
      sinon.restore();
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

      chai.assert.isTrue(false);
    });
  });
});
