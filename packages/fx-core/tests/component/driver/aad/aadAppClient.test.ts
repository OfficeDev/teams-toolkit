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
import { AADManifest } from "../../../../src/component/driver/aad/interface/AADManifest";
import { IAADDefinition } from "../../../../src/component/driver/aad/interface/IAADDefinition";
import { SignInAudience } from "../../../../src/component/driver/aad/interface/signInAudience";
import { DeleteOrUpdatePermissionFailedError } from "../../../../src/component/driver/aad/error/aadManifestError";
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

    it("should use input signInAudience", async () => {
      nock("https://graph.microsoft.com/v1.0")
        .post("/applications")
        .reply(201, (uri, body) => {
          return {
            id: expectedObjectId,
            displayName: expectedDisplayName,
            signInAudience: (body as IAADDefinition).signInAudience,
          };
        });

      const createAadAppResult = await aadAppClient.createAadApp(
        expectedDisplayName,
        SignInAudience.AzureADMultipleOrgs
      );

      expect(createAadAppResult.displayName).to.equal(expectedDisplayName);
      expect(createAadAppResult.id).to.equal(expectedObjectId);
      expect(createAadAppResult.signInAudience).to.equal("AzureADMultipleOrgs");
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

  describe("updateAadApp", async () => {
    let aadAppClient: AadAppClient;
    let axiosInstance: AxiosInstance;
    const mockedManifest: AADManifest = {
      id: expectedObjectId,
      name: "test",
      addIns: [],
      appRoles: [],
      identifierUris: [],
      informationalUrls: {},
      keyCredentials: [],
      knownClientApplications: [],
      oauth2AllowIdTokenImplicitFlow: false,
      oauth2AllowImplicitFlow: false,
      oauth2Permissions: [],
      preAuthorizedApplications: [],
      replyUrlsWithType: [],
      requiredResourceAccess: [],
      signInAudience: "",
      tags: [],
    };

    beforeEach(() => {
      axiosInstance = mockAxiosCreate();
      doNotWaitBetweenEachRetry();
      aadAppClient = new AadAppClient(new MockedM365Provider());
    });

    afterEach(() => {
      sinon.restore();
      nock.cleanAll();
    });

    it("should success when request success", async () => {
      nock("https://graph.microsoft.com/v1.0")
        .patch(`/applications/${expectedObjectId}`)
        .reply(204);

      await expect(aadAppClient.updateAadApp(mockedManifest)).to.eventually.be.not.rejected;
    });

    it("should throw error when request failed with CannotDeleteOrUpdateEnabledEntitlement", async () => {
      const expectedError = {
        error: {
          code: "CannotDeleteOrUpdateEnabledEntitlement",
        },
      };

      sinon.stub(axiosInstance, "patch").rejects({
        isAxiosError: true,
        response: {
          status: 400,
          data: expectedError,
        },
      });
      await expect(aadAppClient.updateAadApp(mockedManifest)).to.eventually.be.rejected.then(
        (err) => {
          expect(err instanceof DeleteOrUpdatePermissionFailedError).to.be.true;
          expect(err.source).equals("AadAppClient");
          expect(err.name).equals("DeleteOrUpdatePermissionFailed");
          expect(err.message).equals(
            "Unable to update or delete an existing permission when it's enabled. One possible reason is that the ACCESS_AS_USER_PERMISSION_ID environment variable is changed for selected environment. Ensure your permission id(s) are identical with the actual AAD application and try again.\n"
          );
        }
      );
    });

    it("should throw error when request fail", async () => {
      const expectedError = {
        error: {
          code: "Request_BadRequest",
          message: `Invalid value specified for property 'signInAudience' of resource 'Application'`,
        },
      };

      nock("https://graph.microsoft.com/v1.0")
        .patch(`/applications/${expectedObjectId}`)
        .times(6)
        .reply(400, expectedError);

      await expect(aadAppClient.updateAadApp(mockedManifest))
        .to.eventually.be.rejectedWith("Request failed with status code 400")
        .then((error) => {
          expect(error.response.data).to.deep.equal(expectedError);
        });
    });

    it("should retry when get 404 response", async () => {
      nock("https://graph.microsoft.com/v1.0")
        .patch(`/applications/${expectedObjectId}`)
        .reply(404);
      nock("https://graph.microsoft.com/v1.0")
        .patch(`/applications/${expectedObjectId}`)
        .reply(204);

      await expect(aadAppClient.updateAadApp(mockedManifest)).not.eventually.be.rejected;
    });

    it("should retry when get 400 response", async () => {
      nock("https://graph.microsoft.com/v1.0")
        .patch(`/applications/${expectedObjectId}`)
        .reply(400);
      nock("https://graph.microsoft.com/v1.0")
        .patch(`/applications/${expectedObjectId}`)
        .reply(204);

      await expect(aadAppClient.updateAadApp(mockedManifest)).not.eventually.be.rejected;
    });
  });

  describe("getOwners", async () => {
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

    it("should return user info when request success", async () => {
      nock("https://graph.microsoft.com/v1.0")
        .get(`/applications/${expectedObjectId}/owners`)
        .reply(200, {
          value: [
            {
              id: "id",
              displayName: "displayName",
              mail: "mail",
            },
          ],
        });

      const result = await aadAppClient.getOwners(expectedObjectId);

      expect(result).to.be.not.undefined;
      expect(result!.length).to.equal(1);
      expect(result![0].userObjectId).to.equal("id");
    });

    it("should throw error when request fail", async () => {
      const expectedError = {
        error: {
          code: "Request_ResourceNotFound",
          message: `Resource '${expectedObjectId}' does not exist or one of its queried reference-property objects are not present.",`,
        },
      };

      // do not use nock to avoid retry
      sinon.stub(axiosInstance, "get").rejects({
        message: "Request failed with status code 404",
        response: {
          status: 400,
          data: expectedError,
        },
      });

      await expect(aadAppClient.getOwners(expectedObjectId))
        .to.eventually.be.rejectedWith("Request failed with status code 404")
        .then((error) => {
          expect(error.response.data).to.deep.equal(expectedError);
        });
    });

    it("should retry when get 404 response", async () => {
      nock("https://graph.microsoft.com/v1.0")
        .get(`/applications/${expectedObjectId}/owners`)
        .reply(404);
      nock("https://graph.microsoft.com/v1.0")
        .get(`/applications/${expectedObjectId}/owners`)
        .reply(200, {
          value: [
            {
              id: "id",
              displayName: "displayName",
              mail: "mail",
            },
          ],
        });

      await expect(aadAppClient.getOwners(expectedObjectId)).not.eventually.be.rejected;
    });
  });

  describe("addOwners", async () => {
    let aadAppClient: AadAppClient;
    let axiosInstance: AxiosInstance;
    const mockedUserObjectId = "userObjectId";

    beforeEach(() => {
      axiosInstance = mockAxiosCreate();
      doNotWaitBetweenEachRetry();
      aadAppClient = new AadAppClient(new MockedM365Provider());
    });

    afterEach(() => {
      sinon.restore();
      nock.cleanAll();
    });

    it("should return user info when request success", async () => {
      nock("https://graph.microsoft.com/v1.0")
        .post(`/applications/${expectedObjectId}/owners/$ref`)
        .reply(200);

      await expect(aadAppClient.addOwner(expectedObjectId, mockedUserObjectId)).to.eventually.be.not
        .rejected;
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

      await expect(aadAppClient.addOwner(expectedObjectId, mockedUserObjectId))
        .to.eventually.be.rejectedWith("Request failed with status code 404")
        .then((error) => {
          expect(error.response.data).to.deep.equal(expectedError);
        });
    });

    it("should retry when get 404 response", async () => {
      nock("https://graph.microsoft.com/v1.0")
        .post(`applications/${expectedObjectId}/owners/$ref`)
        .reply(404);
      nock("https://graph.microsoft.com/v1.0")
        .post(`/applications/${expectedObjectId}/owners/$ref`)
        .reply(200);

      await expect(aadAppClient.addOwner(expectedObjectId, mockedUserObjectId)).to.eventually.be.not
        .rejected;
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
