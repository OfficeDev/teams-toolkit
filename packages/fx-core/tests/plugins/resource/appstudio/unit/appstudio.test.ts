// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import axios from "axios";
import { AppStudioClient } from "../../../../../src/plugins/resource/appstudio/appStudio";
import { AppStudioError } from "../../../../../src/plugins/resource/appstudio/errors";
import { TelemetryUtils } from "../../../../../src/plugins/resource/appstudio/utils/telemetry";
import { RetryHandler } from "../../../../../src/plugins/resource/appstudio/utils/utils";
import { newEnvInfo } from "../../../../../src/core/environment";
import { PluginContext } from "@microsoft/teamsfx-api";

describe("App Studio API Test", () => {
  const appStudioToken = "appStudioToken";

  beforeEach(() => {
    sinon.stub(RetryHandler, "RETRIES").value(1);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("publish Teams app", () => {
    it("API Failure", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "error",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "post").throws(error);

      const ctx = {
        envInfo: newEnvInfo(),
        root: "fakeRoot",
      } as any as PluginContext;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.publishTeamsApp(appStudioToken, Buffer.from(""), appStudioToken);
      } catch (error) {
        chai.assert.equal(error.name, AppStudioError.DeveloperPortalAPIFailedError.name);
      }
    });
  });

  it("BadeRequest with 2xx status code", async () => {
    const fakeAxiosInstance = axios.create();
    sinon.stub(axios, "create").returns(fakeAxiosInstance);

    const response = {
      data: {
        error: "BadRequest",
      },
      message: "fake message",
    };
    sinon.stub(fakeAxiosInstance, "post").resolves(response);

    const ctx = {
      envInfo: newEnvInfo(),
      root: "fakeRoot",
    } as any as PluginContext;
    TelemetryUtils.init(ctx);
    sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

    try {
      await AppStudioClient.publishTeamsApp(appStudioToken, Buffer.from(""), appStudioToken);
    } catch (error) {
      chai.assert.equal(error.name, AppStudioError.DeveloperPortalAPIFailedError.name);
      chai.assert.isNotNull(error.response);
    }
  });
});
