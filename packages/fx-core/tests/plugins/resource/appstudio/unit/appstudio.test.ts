// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import axios from "axios";
import { v4 as uuid } from "uuid";
import { AppStudioClient } from "../../../../../src/plugins/resource/appstudio/appStudio";
import { AppDefinition } from "./../../../../../src/plugins/resource/appstudio/interfaces/appDefinition";
import { AppStudioError } from "../../../../../src/plugins/resource/appstudio/errors";
import { TelemetryUtils } from "../../../../../src/plugins/resource/appstudio/utils/telemetry";
import { RetryHandler } from "../../../../../src/plugins/resource/appstudio/utils/utils";
import { newEnvInfo } from "../../../../../src/core/environment";
import { PluginContext } from "@microsoft/teamsfx-api";
import { PublishingState } from "../../../../../src/plugins/resource/appstudio/interfaces/IPublishingAppDefinition";

describe("App Studio API Test", () => {
  const appStudioToken = "appStudioToken";

  const appDef: AppDefinition = {
    appName: "fake",
    teamsAppId: uuid(),
    userList: [],
  };

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

    it("should throw error with response on BadeRequest with 2xx status code", async () => {
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

    it("Bad gateway", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const postResponse = {
        data: {
          error: {
            code: "BadGateway",
            message: "fakeMessage",
          },
        },
      };
      sinon.stub(fakeAxiosInstance, "post").resolves(postResponse);

      const getResponse = {
        data: {
          value: [
            {
              appDefinitions: [
                {
                  lastModifiedDateTime: new Date(),
                  publishingState: PublishingState.submitted,
                  teamsAppId: uuid(),
                  displayName: "fakeApp",
                },
              ],
            },
          ],
        },
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(getResponse);

      const res = await AppStudioClient.publishTeamsApp(
        appStudioToken,
        Buffer.from(""),
        appStudioToken
      );
      chai.assert.equal(res, getResponse.data.value[0].appDefinitions[0].teamsAppId);
    });
  });

  describe("import Teams app", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: appDef,
      };
      sinon.stub(fakeAxiosInstance, "post").resolves(response);

      const res = await AppStudioClient.importApp(Buffer.from(""), appStudioToken);
      chai.assert.equal(res, appDef);
    });
  });

  describe("get Teams app", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: appDef,
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(response);

      const res = await AppStudioClient.getApp(appDef.teamsAppId!, appStudioToken);
      chai.assert.equal(res, appDef);
    });

    it("404 not found", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "404",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "get").throws(error);

      const ctx = {
        envInfo: newEnvInfo(),
        root: "fakeRoot",
      } as any as PluginContext;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.getApp(appDef.teamsAppId!, appStudioToken);
      } catch (error) {
        chai.assert.equal(error.name, AppStudioError.DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("publishTeamsAppUpdate", () => {
    it("should throw error with response on BadeRequest with 2xx status code", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: {
          error: "BadRequest",
        },
        message: "fake message",
      };

      sinon.stub(fakeAxiosInstance, "post").resolves(response);
      sinon.stub(AppStudioClient, "getAppByTeamsAppId").resolves({
        publishingState: PublishingState.submitted,
        teamsAppId: "xx",
        displayName: "xx",
        lastModifiedDateTime: null,
      });

      const ctx = {
        envInfo: newEnvInfo(),
        root: "fakeRoot",
      } as any as PluginContext;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.publishTeamsAppUpdate("", Buffer.from(""), appStudioToken);
      } catch (error) {
        chai.assert.isNotNull(error.response);
      }
    });
  });
});
