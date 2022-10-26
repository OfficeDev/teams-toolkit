// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";

import { GraphClient } from "../../../../src/component/resource/botService/botRegistration/graphClient";
import {
  CreateAADAppError,
  PluginError,
} from "../../../../src/component/resource/botService/errors";
import { default as axios } from "axios";
import { RetryHandler } from "../../../../src/component/resource/botService/retryHandler";
import { Messages } from "./messages";
import { CommonStrings } from "../../../../src/component/resource/botService/strings";
import { CreateAppError } from "../../../../src/component/resource/aadApp/errors";

describe("Test GraphClient", () => {
  describe("Test registerAadApp", () => {
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
        await GraphClient.registerAadApp(graphToken, displayName);
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
      const result = await GraphClient.registerAadApp(displayName, graphToken);

      // Assert
      chai.assert.isTrue(result.clientId === "appId");
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
        await GraphClient.registerAadApp(graphToken, displayName);
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
        await GraphClient.registerAadApp(graphToken, displayName);
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
        await GraphClient.registerAadApp(graphToken, displayName);
      } catch (e) {
        chai.assert.equal(e.name, "ProvisionError");
        chai.assert.include(e.message, CommonStrings.AAD_APP);
        return;
      }
      chai.assert.fail(Messages.ShouldNotReachHere);
    });
  });
});
