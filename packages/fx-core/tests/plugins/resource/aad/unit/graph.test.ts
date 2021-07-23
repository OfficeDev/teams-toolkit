// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import faker from "faker";
import axios from "axios";
import { GraphClient } from "../../../../../src/plugins/resource/aad/graph";
import { GraphClientErrorMessage } from "../../../../../src/plugins/resource/aad/errors";

describe("Graph API Test", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("createAADApp", () => {
    it("Happy Path", async () => {
      const graphToken = "graphToken";
      const objectId = faker.datatype.uuid();
      const displayName = "createAADApp";

      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "post").resolves({
        data: {
          id: objectId,
          displayName: displayName,
        },
      });

      const createResult = await GraphClient.createAADApp(graphToken, {
        displayName: displayName,
      });

      chai.assert.equal(createResult.id, objectId);
      chai.assert.equal(createResult.displayName, displayName);
    });

    it("Empty Response", async () => {
      const graphToken = "graphToken";
      const displayName = "createAADApp";
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "post").resolves({});

      try {
        const createResult = await GraphClient.createAADApp(graphToken, {
          displayName: displayName,
        });
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${GraphClientErrorMessage.CreateFailed}: ${GraphClientErrorMessage.EmptyResponse}.`
        );
      }
    });
  });

  describe("updateAADApp", () => {
    it("Happy Path", async () => {
      const graphToken = "graphToken";
      const objectId = faker.datatype.uuid();
      const displayName = "updateAADApp";

      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "patch").resolves({
        data: {
          id: objectId,
          displayName: displayName,
        },
      });

      await GraphClient.updateAADApp(graphToken, objectId, {
        displayName: displayName,
      });
    });

    it("Empty Object Id", async () => {
      const graphToken = "graphToken";
      try {
        const updateResult = await GraphClient.updateAADApp(graphToken, "", {});
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${GraphClientErrorMessage.UpdateFailed}: ${GraphClientErrorMessage.AppObjectIdIsNull}.`
        );
      }
    });
  });

  describe("createAadAppSecret", () => {
    it("Happy Path", async () => {
      const graphToken = "graphToken";
      const objectId = faker.datatype.uuid();
      const secret = {
        data: {
          hint: "hint",
          keyId: faker.datatype.uuid(),
          endDateTime: "endDate",
          startDateTime: "startDate",
          secretText: "secret",
        },
      };

      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "post").returns(Promise.resolve(secret));

      const createSecretResult = await GraphClient.createAadAppSecret(graphToken, objectId);
      chai.assert.equal(createSecretResult.value, secret.data.secretText);
      chai.assert.equal(createSecretResult.id, secret.data.keyId);
    });

    it("Empty Response", async () => {
      const graphToken = "graphToken";
      const objectId = faker.datatype.uuid();

      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "post").resolves({});

      try {
        const createSecretResult = await GraphClient.createAadAppSecret(graphToken, objectId);
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${GraphClientErrorMessage.CreateSecretFailed}: ${GraphClientErrorMessage.EmptyResponse}.`
        );
      }
    });

    it("Empty ObjectId", async () => {
      const graphToken = "graphToken";
      try {
        const createSecretResult = await GraphClient.createAadAppSecret(graphToken, "");
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${GraphClientErrorMessage.CreateSecretFailed}: ${GraphClientErrorMessage.AppObjectIdIsNull}.`
        );
      }
    });
  });

  describe("getAadApp", () => {
    it("Happy Path", async () => {
      const graphToken = "graphToken";
      const objectId = faker.datatype.uuid();
      const displayName = "getAadApp";

      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "get").resolves({
        data: {
          id: objectId,
          displayName: displayName,
        },
      });

      const getResult = await GraphClient.getAadApp(graphToken, objectId);

      chai.assert.equal(getResult.id, objectId);
      chai.assert.equal(getResult.displayName, displayName);
    });

    it("Empty Response", async () => {
      const graphToken = "graphToken";
      const objectId = faker.datatype.uuid();

      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "get").resolves({});

      try {
        const getResult = await GraphClient.getAadApp(graphToken, objectId);
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${GraphClientErrorMessage.GetFailed}: ${GraphClientErrorMessage.EmptyResponse}.`
        );
      }
    });

    it("Empty ObjectId", async () => {
      const graphToken = "graphToken";
      try {
        const getResult = await GraphClient.getAadApp(graphToken, "");
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${GraphClientErrorMessage.GetFailed}: ${GraphClientErrorMessage.AppObjectIdIsNull}.`
        );
      }
    });
  });
});
