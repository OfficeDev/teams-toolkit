// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import axios from "axios";
import { RetryHandler } from "../../../../../src/component/resource/appManifest/utils/utils";
import { AuthSvcClient } from "../../../../../src/component/resource/appManifest/authSvcClient";
import { AppStudioError } from "../../../../../src/component/resource/appManifest/errors";

describe("Auth Service API Test", () => {
  beforeEach(() => {
    sinon.stub(RetryHandler, "RETRIES").value(1);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("Happy Path", async () => {
    const fakeAxiosInstance = axios.create();
    sinon.stub(axios, "create").returns(fakeAxiosInstance);

    const response = {
      data: {
        regionGtms: {
          teamsDevPortal: "https://dev.teams.microsoft.com/amer",
        },
      },
    };
    sinon.stub(fakeAxiosInstance, "post").resolves(response);

    const res = await AuthSvcClient.getRegion("fakeToken");
    chai.assert.equal(res, response.data.regionGtms.teamsDevPortal);
  });

  it("API Failure", async () => {
    const fakeAxiosInstance = axios.create();
    sinon.stub(axios, "create").returns(fakeAxiosInstance);

    const error = {
      response: {
        status: 503,
      },
    };
    sinon.stub(fakeAxiosInstance, "post").throws(error);

    try {
      await AuthSvcClient.getRegion("fakeToken");
    } catch (error) {
      chai.assert.equal(error.name, AppStudioError.AuthServiceAPIFailedError.name);
    }
  });
});
