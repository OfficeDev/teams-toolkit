// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import faker from "faker";
import axios from "axios";
import { AppStudio } from "../../../../../src/plugins/resource/aad/appStudio";
import { AppStudioErrorMessage } from "../../../../../src/plugins/resource/aad/errors";

describe("App Studio API Test", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("createAADAppV2", () => {
    it("Happy Path", async () => {
      const appStudioToken = "appStudioToken";
      const objectId = faker.datatype.uuid();
      const displayName = "createAADAppV2";

      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "post").resolves({
        data: {
          id: objectId,
          displayName: displayName,
        },
      });

      const createResult = await AppStudio.createAADAppV2(appStudioToken, {
        displayName: displayName,
      });

      chai.assert.equal(createResult.id, objectId);
      chai.assert.equal(createResult.displayName, displayName);
    });

    it("Empty Response", async () => {
      const appStudioToken = "appStudioToken";
      const displayName = "createAADApp";
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "post").resolves({});

      try {
        const createResult = await AppStudio.createAADAppV2(appStudioToken, {
          displayName: displayName,
        });
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${AppStudioErrorMessage.CreateFailed}: ${AppStudioErrorMessage.EmptyResponse}.`
        );
      }
    });
  });

  describe("updateAADApp", () => {
    it("Happy Path", async () => {
      const appStudioToken = "appStudioToken";
      const objectId = faker.datatype.uuid();
      const displayName = "updateAADApp";

      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "post").resolves({
        data: {
          id: objectId,
          displayName: displayName,
        },
      });

      await AppStudio.updateAADApp(appStudioToken, objectId, {
        displayName: displayName,
      });
    });

    it("Empty Object Id", async () => {
      const graphToken = "graphToken";
      try {
        const updateResult = await AppStudio.updateAADApp(graphToken, "", {});
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${AppStudioErrorMessage.UpdateFailed}: ${AppStudioErrorMessage.AppObjectIdIsNull}.`
        );
      }
    });
  });

  describe("createAADAppPassword", () => {
    it("Happy Path", async () => {
      const appStudioToken = "appStudioToken";
      const objectId = faker.datatype.uuid();
      const secret = {
        data: {
          hint: "hint",
          id: faker.datatype.uuid(),
          endDate: "endDate",
          startDate: "startDate",
          value: "secret",
        },
      };

      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "post").returns(Promise.resolve(secret));

      const createSecretResult = await AppStudio.createAADAppPassword(appStudioToken, objectId);
      chai.assert.equal(createSecretResult.value, secret.data.value);
      chai.assert.equal(createSecretResult.id, secret.data.id);
    });

    it("Empty Response", async () => {
      const appStudioToken = "appStudioToken";
      const objectId = faker.datatype.uuid();

      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "post").resolves({});

      try {
        const createSecretResult = await AppStudio.createAADAppPassword(appStudioToken, objectId);
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${AppStudioErrorMessage.CreateSecretFailed}: ${AppStudioErrorMessage.EmptyResponse}.`
        );
      }
    });

    it("Empty ObjectId", async () => {
      const graphToken = "graphToken";
      try {
        const createSecretResult = await AppStudio.createAADAppPassword(graphToken, "");
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${AppStudioErrorMessage.CreateSecretFailed}: ${AppStudioErrorMessage.AppObjectIdIsNull}.`
        );
      }
    });
  });

  describe("getAadApp", () => {
    it("Happy Path", async () => {
      const appStudioToken = "appStudioToken";
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

      const getResult = await AppStudio.getAadApp(appStudioToken, objectId);

      chai.assert.equal(getResult.id, objectId);
      chai.assert.equal(getResult.displayName, displayName);
    });

    it("Empty Response", async () => {
      const appStudioToken = "appStudioToken";
      const objectId = faker.datatype.uuid();

      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "get").resolves({});

      try {
        const getResult = await AppStudio.getAadApp(appStudioToken, objectId);
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${AppStudioErrorMessage.GetFailed}: ${AppStudioErrorMessage.EmptyResponse}.`
        );
      }
    });

    it("Empty ObjectId", async () => {
      const appStudioToken = "appStudioToken";
      try {
        const getResult = await AppStudio.getAadApp(appStudioToken, "");
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${AppStudioErrorMessage.GetFailed}: ${AppStudioErrorMessage.AppObjectIdIsNull}.`
        );
      }
    });
  });
});
