// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import { AadAppClient } from "../../../../src/component/driver/aad/utility/aadAppClient";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import axios, { AxiosInstance } from "axios";
import nock from "nock";
import { MockedM365Provider } from "../../../plugins/solution/util";
import axiosRetry from "axios-retry";
import { SystemError, err } from "@microsoft/teamsfx-api";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("AadAppClient", async () => {
  const expectedObjectId = "00000000-0000-0000-0000-000000000000";
  const expectedDisplayName = "AAD app name";
  const expectedSecretText = "fake secret";
  const mockedNetworkError = {
    message: "network error",
    code: "ECONNRESET",
  };

  describe("constructor", async () => {
    it("should success", async () => {
      const initializeAadAppClient = function () {
        new AadAppClient(new MockedM365Provider());
      };

      expect(initializeAadAppClient).to.not.throw();
    });
  });

  // uses create AAD app function to test the default retry logic
  describe("internal http client", async () => {
    let aadAppClient: AadAppClient;

    beforeEach(() => {
      mockAxiosCreate();
      doNotWaitBetweenEachRetry();
      aadAppClient = new AadAppClient(new MockedM365Provider());
    });

    afterEach(() => {
      sinon.restore();
      nock.cleanAll();
    });

    it("should throw error if cannot get token", async () => {
      const expectedError = new SystemError(
        "MockedTokenProvider",
        "GetTokenFailed",
        "Get token failed"
      );
      const mockedM365TokenProvider = new MockedM365Provider();
      sinon.stub(mockedM365TokenProvider, "getAccessToken").resolves(err(expectedError));
      const aadAppClient = new AadAppClient(mockedM365TokenProvider);

      await expect(aadAppClient.createAadApp(expectedDisplayName)).to.be.eventually.rejectedWith(
        "Get token failed"
      );
    });

    it("should retry when request failed with network error", async () => {
      nock("https://graph.microsoft.com/v1.0")
        .post("/applications")
        .replyWithError(mockedNetworkError);
      nock("https://graph.microsoft.com/v1.0").post("/applications").reply(201, {
        displayName: expectedDisplayName,
      });

      const result = await aadAppClient.createAadApp(expectedDisplayName);

      expect(result.displayName).equals(expectedDisplayName);
    });

    it("should retry when request failed with 5xx error", async () => {
      nock("https://graph.microsoft.com/v1.0").post("/applications").reply(500);
      nock("https://graph.microsoft.com/v1.0").post("/applications").reply(201, {
        displayName: expectedDisplayName,
      });

      const result = await aadAppClient.createAadApp(expectedDisplayName);

      expect(result.displayName).equals(expectedDisplayName);
    });

    it("should not retry when request failed with 4xx error", async () => {
      nock("https://graph.microsoft.com/v1.0").post("/applications").reply(400);
      nock("https://graph.microsoft.com/v1.0").post("/applications").reply(201, {
        displayName: expectedDisplayName,
      });
    });
  });

  describe("createAadApp", async () => {
    let aadAppClient: AadAppClient;

    beforeEach(() => {
      mockAxiosCreate();
      doNotWaitBetweenEachRetry();
      aadAppClient = new AadAppClient(new MockedM365Provider());
    });

    afterEach(() => {
      sinon.restore();
      nock.cleanAll();
    });

    it("should return app instance when request success", async () => {
      nock("https://graph.microsoft.com/v1.0").post("/applications").reply(201, {
        id: expectedObjectId,
        displayName: expectedDisplayName,
      });

      const createAadAppResult = await aadAppClient.createAadApp(expectedDisplayName);

      expect(createAadAppResult.displayName).to.equal(expectedDisplayName);
      expect(createAadAppResult.id).to.equal(expectedObjectId);
    });

    it("should throw error when request fail", async () => {
      const expectedError = {
        error: {
          code: "Request_BadRequest",
          message: "Invalid value specified for property 'displayName' of resource 'Application'.",
        },
      };

      nock("https://graph.microsoft.com/v1.0").post("/applications").reply(400, expectedError);

      await expect(aadAppClient.createAadApp(""))
        .to.eventually.be.rejectedWith("Request failed with status code 400")
        .then((error) => {
          expect(error.response.data).to.deep.equal(expectedError);
        });
    });
  });

  describe("generateClientSecret", async () => {
    let aadAppClient: AadAppClient;
    let axiosInstance: AxiosInstance;

    beforeEach(() => {
      axiosInstance = mockAxiosCreate();
      doNotWaitBetweenEachRetry();
      aadAppClient = new AadAppClient(new MockedM365Provider());
    });

    afterEach(() => {
      sinon.restore();
      nock.cleanAll();
    });

    it("should return secret when request success", async () => {
      nock("https://graph.microsoft.com/v1.0")
        .post(`/applications/${expectedObjectId}/addPassword`)
        .reply(200, {
          secretText: expectedSecretText,
        });

      const result = await aadAppClient.generateClientSecret(expectedObjectId);

      expect(result).to.equal(expectedSecretText);
    });

    it("should throw error when request fail", async () => {
      const expectedError = {
        error: {
          code: "Request_ResourceNotFound",
          message: `Resource '${expectedObjectId}' does not exist or one of its queried reference-property objects are not present.",`,
        },
      };

      // do not use nock to avoid retry
      sinon.stub(axiosInstance, "post").rejects({
        message: "Request failed with status code 404",
        response: {
          status: 400,
          data: expectedError,
        },
      });

      await expect(aadAppClient.generateClientSecret(expectedObjectId))
        .to.eventually.be.rejectedWith("Request failed with status code 404")
        .then((error) => {
          expect(error.response.data).to.deep.equal(expectedError);
        });
    });

    // generateClientSecret has different retry policy, need to test again
    it("should retry when request failed with network error", async () => {
      nock("https://graph.microsoft.com/v1.0")
        .post(`/applications/${expectedObjectId}/addPassword`)
        .replyWithError(mockedNetworkError);
      nock("https://graph.microsoft.com/v1.0")
        .post(`/applications/${expectedObjectId}/addPassword`)
        .reply(200, {
          secretText: expectedSecretText,
        });

      const result = await aadAppClient.generateClientSecret(expectedObjectId);

      expect(result).equals(expectedSecretText);
    });

    // generateClientSecret has different retry policy, need to test again
    it("should retry when request failed with 5xx error", async () => {
      nock("https://graph.microsoft.com/v1.0")
        .post(`/applications/${expectedObjectId}/addPassword`)
        .reply(500);
      nock("https://graph.microsoft.com/v1.0")
        .post(`/applications/${expectedObjectId}/addPassword`)
        .reply(200, {
          secretText: expectedSecretText,
        });

      const result = await aadAppClient.generateClientSecret(expectedObjectId);

      expect(result).equals(expectedSecretText);
    });

    // generateClientSecret has different retry policy, need to test again
    it("should retry when request failed with 4xx error", async () => {
      nock("https://graph.microsoft.com/v1.0")
        .post(`/applications/${expectedObjectId}/addPassword`)
        .reply(404);
      nock("https://graph.microsoft.com/v1.0")
        .post(`/applications/${expectedObjectId}/addPassword`)
        .reply(200, {
          secretText: expectedSecretText,
        });

      const result = await aadAppClient.generateClientSecret(expectedObjectId);

      expect(result).equals(expectedSecretText);
    });
  });
});

function mockAxiosCreate() {
  const fakeAxiosInstance = axios.create({
    baseURL: "https://graph.microsoft.com/v1.0",
  });
  sinon.stub(axios, "create").returns(fakeAxiosInstance);
  return fakeAxiosInstance;
}

function doNotWaitBetweenEachRetry() {
  sinon.stub(axiosRetry, "exponentialDelay").returns(0); // always delay 0 ms
}
