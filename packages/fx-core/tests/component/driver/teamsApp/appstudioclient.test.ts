// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import axios from "axios";
import { v4 as uuid } from "uuid";
import { Context, TeamsAppManifest, ok, err } from "@microsoft/teamsfx-api";
import { AppStudioClient } from "../../../../src/component/driver/teamsApp/clients/appStudioClient";
import { AppDefinition } from "../../../../src/component/driver/teamsApp/interfaces/appdefinitions/appDefinition";
import { AppUser } from "../../../../src/component/driver/teamsApp/interfaces/appdefinitions/appUser";
import { AppStudioError } from "../../../../src/component/driver/teamsApp/errors";
import { TelemetryUtils } from "../../../../src/component/driver/teamsApp/utils/telemetry";
import { RetryHandler } from "../../../../src/component/driver/teamsApp/utils/utils";
import { PublishingState } from "../../../../src/component/driver/teamsApp/interfaces/appdefinitions/IPublishingAppDefinition";
import { manifestUtils } from "../../../../src/component/driver/teamsApp/utils/ManifestUtils";
import { AppStudioResultFactory } from "../../../../src/component/driver/teamsApp/results";
import { Constants } from "../../../../src/component/driver/teamsApp/constants";
import { MockedLogProvider } from "../../../plugins/solution/util";

function newEnvInfo() {
  return {
    envName: "default",
    config: {},
    state: new Map(),
  };
}

describe("App Studio API Test", () => {
  const appStudioToken = "appStudioToken";
  const logProvider = new MockedLogProvider();

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
      } as any;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.publishTeamsApp(appStudioToken, Buffer.from(""), appStudioToken);
      } catch (error) {
        chai.assert.equal(error.name, AppStudioError.DeveloperPortalAPIFailedError.name);
      }
    });

    it("should contain x-correlation-id on BadeRequest with 2xx status code", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const xCorrelationId = "fakeCorrelationId";
      const response = {
        data: {
          error: "BadRequest",
        },
        message: "fake message",
        headers: {
          "x-correlation-id": xCorrelationId,
        },
      };
      sinon.stub(fakeAxiosInstance, "post").resolves(response);

      const ctx = {
        envInfo: newEnvInfo(),
        root: "fakeRoot",
      } as any;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.publishTeamsApp(appStudioToken, Buffer.from(""), appStudioToken);
      } catch (error) {
        chai.assert.equal(error.name, AppStudioError.DeveloperPortalAPIFailedError.name);
        chai.assert.include(error.message, xCorrelationId);
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

      AppStudioClient.setRegion("https://dev.teams.microsoft.com/amer");

      const res = await AppStudioClient.importApp(Buffer.from(""), appStudioToken, logProvider);
      chai.assert.equal(res, appDef);
    });

    it("Happy path - with wrong region", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: appDef,
      };
      sinon.stub(fakeAxiosInstance, "post").resolves(response);
      AppStudioClient.setRegion("https://dev.teams.microsoft.com");

      const res = await AppStudioClient.importApp(Buffer.from(""), appStudioToken, logProvider);
      chai.assert.equal(res, appDef);
    });

    it("409 conflict", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        response: {
          status: 409,
        },
      };
      sinon.stub(fakeAxiosInstance, "post").throws(error);

      const ctx = {
        envInfo: newEnvInfo(),
        root: "fakeRoot",
      } as any;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.importApp(Buffer.from(""), appStudioToken, logProvider);
      } catch (error) {
        chai.assert.equal(error.name, AppStudioError.TeamsAppCreateConflictError.name);
      }
    });

    it("422 conflict", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        response: {
          status: 422,
          data: "Unable import, App already exists and published. publishStatus: 'LobStore'",
        },
      };
      sinon.stub(fakeAxiosInstance, "post").throws(error);
      const ctx = {
        envInfo: newEnvInfo(),
        root: "fakeRoot",
      } as any;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.importApp(Buffer.from(""), appStudioToken, logProvider);
      } catch (error) {
        chai.assert.equal(
          error.name,
          AppStudioError.TeamsAppCreateConflictWithPublishedAppError.name
        );
      }
    });

    it("422 other error", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        response: {
          status: 422,
          data: "fake error message",
          headers: {
            "x-correlation-id": uuid(),
          },
        },
      };
      sinon.stub(fakeAxiosInstance, "post").throws(error);
      const ctx = {
        envInfo: newEnvInfo(),
        root: "fakeRoot",
      } as any;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.importApp(Buffer.from(""), appStudioToken, logProvider);
      } catch (error) {
        chai.assert.equal(error.name, AppStudioError.DeveloperPortalAPIFailedError.name);
      }
    });

    it("invalid Teams app id", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon
        .stub(manifestUtils, "extractManifestFromArchivedFile")
        .returns(ok(new TeamsAppManifest()));

      const error = {
        response: {
          status: 400,
          data: "App Id must be a GUID",
        },
      };
      sinon.stub(fakeAxiosInstance, "post").throws(error);

      const ctx = {
        envInfo: newEnvInfo(),
        root: "fakeRoot",
      } as any;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.importApp(Buffer.from(""), appStudioToken, logProvider);
      } catch (error) {
        chai.assert.equal(error.name, AppStudioError.InvalidTeamsAppIdError.name);
      }
    });

    it("extract manifet failed", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      const fileNotFoundError = AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(Constants.MANIFEST_FILE)
      );
      sinon.stub(manifestUtils, "extractManifestFromArchivedFile").returns(err(fileNotFoundError));

      const error = {
        response: {
          status: 400,
          data: "App Id must be a GUID",
        },
      };
      sinon.stub(fakeAxiosInstance, "post").throws(error);

      const ctx = {
        envInfo: newEnvInfo(),
        root: "fakeRoot",
      } as any;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.importApp(Buffer.from(""), appStudioToken, logProvider);
      } catch (error) {
        chai.assert.equal(error.name, AppStudioError.FileNotFoundError.name);
      }
    });

    it("400 bad reqeust", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        response: {
          staus: 400,
          data: "BadRequest",
          headers: {
            "x-correlation-id": uuid(),
          },
        },
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "post").throws(error);
      const ctx = {
        envInfo: newEnvInfo(),
        root: "fakeRoot",
      } as any;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.importApp(Buffer.from(""), appStudioToken, logProvider);
      } catch (error) {
        chai.assert.equal(error.name, AppStudioError.DeveloperPortalAPIFailedError.name);
      }
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

      const res = await AppStudioClient.getApp(appDef.teamsAppId!, appStudioToken, logProvider);
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
      } as any;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.getApp(appDef.teamsAppId!, appStudioToken, logProvider);
      } catch (error) {
        chai.assert.equal(error.name, AppStudioError.DeveloperPortalAPIFailedError.name);
      }
    });

    it("region - 404", async () => {
      AppStudioClient.setRegion("https://dev.teams.microsoft.com/amer");
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        response: {
          status: 404,
          headers: {
            "x-correlation-id": "fakeCorrelationId",
          },
        },
      };
      sinon.stub(fakeAxiosInstance, "get").throws(error);

      const ctx = {
        envInfo: newEnvInfo(),
        root: "fakeRoot",
      } as any;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.getApp(appDef.teamsAppId!, appStudioToken, logProvider);
      } catch (error) {
        chai.assert.equal(error.name, AppStudioError.DeveloperPortalAPIFailedError.name);
      } finally {
        AppStudioClient.setRegion(undefined as unknown as string);
      }
    });
  });

  describe("Check exists in tenant", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: true,
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(response);

      const res = await AppStudioClient.checkExistsInTenant(appDef.teamsAppId!, appStudioToken);
      chai.assert.isTrue(res);
    });
  });

  describe("publishTeamsAppUpdate", () => {
    it("should contain x-correlation-id on BadeRequest with 2xx status code", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const xCorrelationId = "fakeCorrelationId";
      const postResponse = {
        data: {
          error: "BadRequest",
        },
        message: "fake message",
        headers: {
          "x-correlation-id": xCorrelationId,
        },
      };

      sinon.stub(fakeAxiosInstance, "post").resolves(postResponse);

      const getResponse = {
        data: {
          value: [
            {
              appDefinitions: [
                {
                  publishingState: PublishingState.submitted,
                  teamsAppId: "xx",
                  displayName: "xx",
                  lastModifiedDateTime: null,
                },
              ],
            },
          ],
        },
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(getResponse);

      const ctx = {
        envInfo: newEnvInfo(),
        root: "fakeRoot",
      } as any;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.publishTeamsAppUpdate("", Buffer.from(""), appStudioToken);
      } catch (error) {
        chai.assert.include(error.message, xCorrelationId);
      }
    });
  });

  describe("grantPermission", () => {
    it("API Failure", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "error",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "post").throws(error);
      sinon.stub(fakeAxiosInstance, "get").resolves({ data: appDef });

      const appUser: AppUser = {
        tenantId: uuid(),
        aadId: uuid(),
        displayName: "fake",
        userPrincipalName: "fake",
        isAdministrator: false,
      };

      const ctx = {
        envInfo: newEnvInfo(),
        root: "fakeRoot",
      } as any;
      TelemetryUtils.init(ctx);
      sinon.stub(TelemetryUtils, "sendErrorEvent").callsFake(() => {});

      try {
        await AppStudioClient.grantPermission(
          appDef.teamsAppId!,
          appStudioToken,
          appUser,
          logProvider
        );
      } catch (e) {
        chai.assert.equal(e.name, error.name);
      }
    });
  });
});
