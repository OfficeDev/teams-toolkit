// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import faker from "faker";
import axios from "axios";
import { GraphClient } from "../../../../../src/component/resource/aadApp/graph";
import { GraphClientErrorMessage } from "../../../../../src/component/resource/aadApp/errors";

describe("Graph API Test", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("checkPermission", () => {
    it("Happy Path", async () => {
      const fakeAxiosInstance = axios.create();
      const userObjectId = faker.datatype.uuid();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "get").resolves({
        data: {
          value: [
            {
              id: userObjectId,
            },
          ],
        },
      });

      const checkPermissionResult = await GraphClient.checkPermission(
        "graphToken",
        faker.datatype.uuid(),
        userObjectId
      );

      chai.assert.equal(checkPermissionResult, true);
    });

    it("Empty Object Id", async () => {
      try {
        const checkPermissionResult = await GraphClient.checkPermission(
          "graphToken",
          "",
          faker.datatype.uuid()
        );
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${GraphClientErrorMessage.CheckPermissionFailed}: ${GraphClientErrorMessage.AppObjectIdIsNull}.`
        );
      }
    });

    it("Empty User Object Id", async () => {
      try {
        const checkPermissionResult = await GraphClient.checkPermission(
          "graphToken",
          faker.datatype.uuid(),
          ""
        );
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${GraphClientErrorMessage.CheckPermissionFailed}: ${GraphClientErrorMessage.UserObjectIdIsNull}.`
        );
      }
    });

    it("Empty Response", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "get").resolves({
        data: {},
      });

      const checkPermissionResult = await GraphClient.checkPermission(
        "graphToken",
        faker.datatype.uuid(),
        faker.datatype.uuid()
      );
      chai.assert.equal(checkPermissionResult, false);
    });
  });

  describe("grantPermission", () => {
    it("Happy Path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "post").resolves();

      const grantPermissionResult = await GraphClient.grantPermission(
        "graphToken",
        faker.datatype.uuid(),
        faker.datatype.uuid()
      );
    });

    it("Empty Object Id", async () => {
      try {
        const grantPermissionResult = await GraphClient.grantPermission(
          "graphToken",
          "",
          faker.datatype.uuid()
        );
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${GraphClientErrorMessage.GrantPermissionFailed}: ${GraphClientErrorMessage.AppObjectIdIsNull}.`
        );
      }
    });

    it("Empty User Object Id", async () => {
      try {
        const grantPermissionResult = await GraphClient.grantPermission(
          "graphToken",
          faker.datatype.uuid(),
          ""
        );
      } catch (error) {
        chai.assert.equal(
          error.message,
          `${GraphClientErrorMessage.GrantPermissionFailed}: ${GraphClientErrorMessage.UserObjectIdIsNull}.`
        );
      }
    });
  });
});
