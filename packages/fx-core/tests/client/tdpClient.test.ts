// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TeamsAppManifest, err, ok } from "@microsoft/teamsfx-api";
import axios from "axios";
import * as chai from "chai";
import "mocha";
import * as sinon from "sinon";
import { createSandbox } from "sinon";
import { v4 as uuid } from "uuid";
import { RetryHandler, teamsDevPortalClient } from "../../src/client/teamsDevPortalClient";
import { setTools } from "../../src/common/globalVars";
import { AppStudioClient } from "../../src/component/driver/teamsApp/clients/appStudioClient";
import { Constants } from "../../src/component/driver/teamsApp/constants";
import { AppStudioError } from "../../src/component/driver/teamsApp/errors";
import {
  ApiSecretRegistration,
  ApiSecretRegistrationAppType,
  ApiSecretRegistrationUpdate,
} from "../../src/component/driver/teamsApp/interfaces/ApiSecretRegistration";
import { AsyncAppValidationStatus } from "../../src/component/driver/teamsApp/interfaces/AsyncAppValidationResponse";
import {
  OauthRegistration,
  OauthRegistrationAppType,
  OauthRegistrationTargetAudience,
  OauthRegistrationUserAccessType,
} from "../../src/component/driver/teamsApp/interfaces/OauthRegistration";
import { PublishingState } from "../../src/component/driver/teamsApp/interfaces/appdefinitions/IPublishingAppDefinition";
import { AppDefinition } from "../../src/component/driver/teamsApp/interfaces/appdefinitions/appDefinition";
import { AppUser } from "../../src/component/driver/teamsApp/interfaces/appdefinitions/appUser";
import { AppStudioResultFactory } from "../../src/component/driver/teamsApp/results";
import { manifestUtils } from "../../src/component/driver/teamsApp/utils/ManifestUtils";
import { IBotRegistration } from "../../src/component/resource/botService/appStudio/interfaces/IBotRegistration";
import { ErrorNames } from "../../src/component/resource/botService/constants";
import { DeveloperPortalAPIFailedError } from "../../src/error/teamsApp";
import { Messages } from "../component/resource/botService/messages";
import { MockTools } from "../core/utils";
import { MockedLogProvider } from "../plugins/solution/util";

describe("TeamsDevPortalClient Test", () => {
  const tools = new MockTools();
  const sandbox = createSandbox();
  setTools(tools);

  const appStudioToken = "appStudioToken";
  const logProvider = new MockedLogProvider();

  const appDef: AppDefinition = {
    appName: "fake",
    teamsAppId: uuid(),
    userList: [],
  };

  const appApiRegistration: ApiSecretRegistration = {
    id: "fakeId",
    description: "An Api Key registration for auth",
    clientSecrets: [
      {
        id: uuid(),
        value: "fakeValue",
        isValueRedacted: false,
      },
    ],
    applicableToApps: ApiSecretRegistrationAppType.AnyApp,
    targetUrlsShouldStartWith: ["https://www.example.com"],
  };

  const fakeOauthRegistration: OauthRegistration = {
    description: "fake-description",
    scopes: ["fake-scope"],
    clientId: "fake-client-id",
    clientSecret: "fake-client-secret",
    authorizationEndpoint: "fake-authorization-url",
    tokenExchangeEndpoint: "fake-token-endpoint",
    tokenRefreshEndpoint: "fake-refresh-endpoint",
    applicableToApps: OauthRegistrationAppType.AnyApp,
    targetAudience: OauthRegistrationTargetAudience.AnyTenant,
    manageableByUsers: [
      {
        userId: "fake-user-id",
        accessType: OauthRegistrationUserAccessType.ReadWrite,
      },
    ],
    targetUrlsShouldStartWith: ["fake-domain"],
  };

  const sampleBot: IBotRegistration = {
    botId: "0cd14903-d43a-47f5-b907-73c523aff076",
    name: "ruhe01290236-local-debug",
    description: "",
    iconUrl:
      "https://docs.botframework.com/static/devportal/client/images/bot-framework-default.png",
    messagingEndpoint: "https://8075-167-220-255-43.ngrok.io/api/messages",
    callingEndpoint: "",
  };
  beforeEach(() => {
    sinon.stub(RetryHandler, "RETRIES").value(1);
  });

  afterEach(() => {
    sinon.restore();
  });
  describe("setRegionByToken", () => {
    it("Happy path", async () => {
      sandbox.stub(RetryHandler, "Retry").resolves({
        status: 200,
        data: {
          regionGtms: {
            teamsDevPortal: "https://xxx.xxx.xxx",
          },
        },
      });
      await teamsDevPortalClient.setRegionByToken("");
      chai.assert.equal(teamsDevPortalClient.region, "https://xxx.xxx.xxx");
    });
  });
  describe("publishTeamsApp", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      const response = {
        data: {
          id: "fakeId",
        },
      };
      sinon.stub(fakeAxiosInstance, "post").resolves(response);

      const res = await teamsDevPortalClient.publishTeamsApp(
        appStudioToken,
        "fakeId",
        Buffer.from("")
      );
      chai.assert.equal(res, response.data.id);
    });

    it("API Failure", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "error",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "post").throws(error);

      try {
        await teamsDevPortalClient.publishTeamsApp(appStudioToken, "fakeId", Buffer.from(""));
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
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

      try {
        await teamsDevPortalClient.publishTeamsApp(appStudioToken, "fakeId", Buffer.from(""));
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
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

      const res = await teamsDevPortalClient.publishTeamsApp(
        appStudioToken,
        "fakeId",
        Buffer.from("")
      );
      chai.assert.equal(res, getResponse.data.value[0].appDefinitions[0].teamsAppId);
    });

    it("AppdefinitionsAlreadyExists - update", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const publishResponse = {
        data: {
          error: {
            code: "Conflict",
            message: "Conflict",
            innerError: {
              code: "AppDefinitionAlreadyExists",
            },
          },
        },
      };

      const updateResponse = {
        data: {
          teamsAppId: "fakeId",
        },
      };
      sinon
        .stub(fakeAxiosInstance, "post")
        .onFirstCall()
        .resolves(publishResponse)
        .onSecondCall()
        .resolves(updateResponse);
      sinon.stub(teamsDevPortalClient, "publishTeamsAppUpdate").resolves("fakeId");

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

      const res = await teamsDevPortalClient.publishTeamsApp(
        appStudioToken,
        "fakeId",
        Buffer.from("")
      );
      chai.assert.equal(res, "fakeId");
    });

    it("AppdefinitionsAlreadyExists - failed", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const postResponse = {
        data: {
          error: {
            code: "Conflict",
            message: "Conflict",
            innerError: {
              code: "AppDefinitionAlreadyExists",
            },
          },
        },
      };
      sinon.stub(fakeAxiosInstance, "post").resolves(postResponse);

      try {
        await teamsDevPortalClient.publishTeamsApp(appStudioToken, "fakeId", Buffer.from(""));
      } catch (error) {
        chai.assert.equal(error.name, AppStudioError.TeamsAppPublishConflictError.name);
      }
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

      teamsDevPortalClient.region = "https://dev.teams.microsoft.com/amer";

      const res = await teamsDevPortalClient.importApp(appStudioToken, Buffer.from(""));
      chai.assert.equal(res, appDef);
    });

    it("Happy path - with wrong region", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: appDef,
      };
      sinon.stub(fakeAxiosInstance, "post").resolves(response);
      teamsDevPortalClient.region = "https://dev.teams.microsoft.com";
      const res = await teamsDevPortalClient.importApp(appStudioToken, Buffer.from(""));
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

      try {
        await teamsDevPortalClient.importApp(appStudioToken, Buffer.from(""));
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

      try {
        await teamsDevPortalClient.importApp(appStudioToken, Buffer.from(""));
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

      try {
        await teamsDevPortalClient.importApp(appStudioToken, Buffer.from(""));
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
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

      try {
        await teamsDevPortalClient.importApp(appStudioToken, Buffer.from(""));
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

      try {
        await teamsDevPortalClient.importApp(appStudioToken, Buffer.from(""));
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

      try {
        await teamsDevPortalClient.importApp(appStudioToken, Buffer.from(""));
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
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

      const res = await teamsDevPortalClient.getApp(appStudioToken, appDef.teamsAppId!);
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

      try {
        await teamsDevPortalClient.getApp(appStudioToken, appDef.teamsAppId!);
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
      }
    });

    it("region - 404", async () => {
      teamsDevPortalClient.region = "https://dev.teams.microsoft.com/amer";
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

      try {
        await teamsDevPortalClient.getApp(appStudioToken, appDef.teamsAppId!);
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
      } finally {
        AppStudioClient.setRegion(undefined as unknown as string);
      }
    });
  });

  describe("get app package", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: "fakeData",
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(response);

      const res = await teamsDevPortalClient.getAppPackage(appStudioToken, appDef.teamsAppId!);
      chai.assert.equal(res, "fakeData");
    });

    it("404 not found", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "404",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "get").throws(error);

      try {
        await teamsDevPortalClient.getAppPackage(appStudioToken, appDef.teamsAppId!);
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("partner center app validation", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: {
          status: "Accepted",
          errors: [],
          warnings: [],
          notes: [],
          addInDetails: {
            displayName: "fakeApp",
            developerName: "Teams",
            version: "0.0.1",
            manifestVersion: "1.16",
          },
        },
      };
      sinon.stub(fakeAxiosInstance, "post").resolves(response);

      const res = await teamsDevPortalClient.partnerCenterAppPackageValidation(
        appStudioToken,
        Buffer.from("")
      );
      chai.assert.equal(res, response.data);
    });

    it("422", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "422",
        message: "Invalid zip",
      };
      sinon.stub(fakeAxiosInstance, "post").throws(error);

      try {
        await teamsDevPortalClient.partnerCenterAppPackageValidation(
          appStudioToken,
          Buffer.from("")
        );
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
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

      const res = await teamsDevPortalClient.checkExistsInTenant(
        appStudioToken,
        appDef.teamsAppId!
      );
      chai.assert.isTrue(res);
    });

    it("404 not found", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "404",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "get").throws(error);

      try {
        await teamsDevPortalClient.checkExistsInTenant(appStudioToken, appDef.teamsAppId!);
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
      }
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

      try {
        await teamsDevPortalClient.publishTeamsAppUpdate(appStudioToken, "", Buffer.from(""));
      } catch (error) {
        chai.assert.include(error.message, xCorrelationId);
      }
    });

    it("API Failure", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "error",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "post").throws(error);

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

      try {
        await teamsDevPortalClient.publishTeamsAppUpdate(appStudioToken, "", Buffer.from(""));
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
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

      try {
        await teamsDevPortalClient.grantPermission(appStudioToken, appDef.teamsAppId!, appUser);
      } catch (e) {
        chai.assert.equal(e.name, error.name);
      }
    });

    it("happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const newAppUser: AppUser = {
        tenantId: "new-tenant-id",
        aadId: "new-aad-id",
        displayName: "fake",
        userPrincipalName: "fake",
        isAdministrator: false,
      };
      const teamsAppId = appDef.teamsAppId!;
      const appDefWithUser: AppDefinition = {
        appName: "fake",
        teamsAppId: teamsAppId,
        userList: [
          {
            tenantId: "fake-tenant-id",
            aadId: "fake-aad-id",
            displayName: "fake",
            userPrincipalName: "fake",
            isAdministrator: false,
          },
        ],
      };
      const appDefWithUserAdded: AppDefinition = {
        appName: "fake",
        teamsAppId: teamsAppId,
        userList: [
          {
            tenantId: "fake-tenant-id",
            aadId: "fake-aad-id",
            displayName: "fake",
            userPrincipalName: "fake",
            isAdministrator: false,
          },
          newAppUser,
        ],
      };
      sinon.stub(fakeAxiosInstance, "get").resolves({
        data: appDefWithUser,
      });
      sinon.stub(fakeAxiosInstance, "post").resolves({
        data: appDefWithUserAdded,
      });

      const res = await teamsDevPortalClient.grantPermission(
        appStudioToken,
        appDef.teamsAppId!,
        newAppUser
      );
    });

    it("happy path with region", async () => {
      AppStudioClient.setRegion("https://dev.teams.microsoft.com/amer");

      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const newAppUser: AppUser = {
        tenantId: "new-tenant-id",
        aadId: "new-aad-id",
        displayName: "fake",
        userPrincipalName: "fake",
        isAdministrator: false,
      };
      const teamsAppId = appDef.teamsAppId!;
      const appDefWithUser: AppDefinition = {
        appName: "fake",
        teamsAppId: teamsAppId,
        userList: [
          {
            tenantId: "fake-tenant-id",
            aadId: "fake-aad-id",
            displayName: "fake",
            userPrincipalName: "fake",
            isAdministrator: false,
          },
        ],
      };
      const appDefWithUserAdded: AppDefinition = {
        appName: "fake",
        teamsAppId: teamsAppId,
        userList: [
          {
            tenantId: "fake-tenant-id",
            aadId: "fake-aad-id",
            displayName: "fake",
            userPrincipalName: "fake",
            isAdministrator: false,
          },
          newAppUser,
        ],
      };
      sinon.stub(fakeAxiosInstance, "get").resolves({
        data: appDefWithUser,
      });
      sinon.stub(fakeAxiosInstance, "post").resolves({
        data: appDefWithUserAdded,
      });

      const res = await teamsDevPortalClient.grantPermission(
        appStudioToken,
        appDef.teamsAppId!,
        newAppUser
      );
    });
  });

  describe("getUserList", () => {
    it("happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: appDef,
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(response);

      const res = await teamsDevPortalClient.getUserList(appStudioToken, appDef.teamsAppId!);
    });
  });

  describe("checkPermission", () => {
    it("No permission", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: appDef,
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(response);

      const res = await AppStudioClient.checkPermission(
        appDef.teamsAppId!,
        appStudioToken,
        "fakeUesrId",
        logProvider
      );
      chai.assert.equal(res, Constants.PERMISSIONS.noPermission);
    });
  });

  describe("getApiKeyRegistration", () => {
    it("404 not found", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "404",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "get").throws(error);

      try {
        await teamsDevPortalClient.getApiKeyRegistrationById(appStudioToken, "fakeId");
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
      }
    });

    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: appApiRegistration,
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(response);

      const res = await teamsDevPortalClient.getApiKeyRegistrationById(appStudioToken, "fakeId");
      chai.assert.equal(res, appApiRegistration);
    });
  });

  describe("createApiKeyRegistration", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: appApiRegistration,
      };
      sinon.stub(fakeAxiosInstance, "post").resolves(response);

      const res = await teamsDevPortalClient.createApiKeyRegistration(
        appStudioToken,
        appApiRegistration
      );
      chai.assert.equal(res, appApiRegistration);
    });

    it("Graph API failure", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        response: {
          staus: 400,
          data: {
            statusCode: 400,
            errorMessage:
              "Unsuccessful response received from Teams Graph Service. Error Message: System.Net.Http.HttpConnectionResponseContent",
          },
          headers: {
            "x-correlation-id": uuid(),
          },
        },
      };
      sinon.stub(fakeAxiosInstance, "post").throws(error);

      try {
        await teamsDevPortalClient.createApiKeyRegistration(appStudioToken, appApiRegistration);
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("updateApiKeyRegistration", () => {
    const appApiRegistration: ApiSecretRegistrationUpdate = {
      description: "fake description",
      applicableToApps: ApiSecretRegistrationAppType.AnyApp,
      targetUrlsShouldStartWith: ["https://www.example.com"],
    };
    it("404 not found", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "404",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "patch").throws(error);

      try {
        await teamsDevPortalClient.updateApiKeyRegistration(
          appStudioToken,
          appApiRegistration,
          "fakeId"
        );
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
      }
    });

    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: appApiRegistration,
      };
      sinon.stub(fakeAxiosInstance, "patch").resolves(response);

      const res = await teamsDevPortalClient.updateApiKeyRegistration(
        appStudioToken,
        appApiRegistration,
        "fakeId"
      );
      chai.assert.equal(res, appApiRegistration);
    });
  });

  describe("createOauthRegistration", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: {
          configurationRegistrationId: {
            oAuthConfigId: "fakeId",
          },
        },
      };
      sinon.stub(fakeAxiosInstance, "post").resolves(response);

      const res = await teamsDevPortalClient.createOauthRegistration(
        appStudioToken,
        fakeOauthRegistration
      );
      chai.assert.equal(res.configurationRegistrationId.oAuthConfigId, "fakeId");
    });

    it("Graph API failure", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        response: {
          staus: 400,
          data: {
            statusCode: 400,
            errorMessage:
              "Unsuccessful response received from Teams Graph Service. Error Message: System.Net.Http.HttpConnectionResponseContent",
          },
          headers: {
            "x-correlation-id": uuid(),
          },
        },
      };
      sinon.stub(fakeAxiosInstance, "get").throws(error);

      try {
        await teamsDevPortalClient.createOauthRegistration(appStudioToken, fakeOauthRegistration);
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("getOauthRegistration", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: fakeOauthRegistration,
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(response);

      const res = await teamsDevPortalClient.getOauthRegistrationById(appStudioToken, "fakeId");
      chai.assert.equal(res, fakeOauthRegistration);
    });

    it("Graph API failure", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "404",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "get").throws(error);

      try {
        await teamsDevPortalClient.getOauthRegistrationById(appStudioToken, "fakeId");
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("updateOauthRegistration", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: fakeOauthRegistration,
      };
      sinon.stub(fakeAxiosInstance, "patch").resolves(response);

      const res = await teamsDevPortalClient.updateOauthRegistration(
        appStudioToken,
        fakeOauthRegistration,
        "fakeId"
      );
      chai.assert.equal(res, fakeOauthRegistration);
    });

    it("Graph API failure", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "404",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "patch").throws(error);

      try {
        await teamsDevPortalClient.updateOauthRegistration(
          appStudioToken,
          fakeOauthRegistration,
          "fakeId"
        );
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("list Teams app", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: [appDef],
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(response);
      teamsDevPortalClient.setRegion("https://dev.teams.microsoft.com/amer");
      const res = await teamsDevPortalClient.listApps(appStudioToken);
      chai.assert.deepEqual(res, [appDef]);
    });
    it("Error - no region", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: [appDef],
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(response);
      teamsDevPortalClient.setRegion("");
      try {
        await teamsDevPortalClient.listApps(appStudioToken);
        chai.assert.fail("should throw error");
      } catch (e) {
        chai.assert.isTrue(e instanceof Error);
      }
    });
    it("Error - api failure", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "get").rejects(new Error());
      teamsDevPortalClient.setRegion("https://dev.teams.microsoft.com/amer");
      try {
        await teamsDevPortalClient.listApps(appStudioToken);
        chai.assert.fail("should throw error");
      } catch (e) {
        chai.assert.isTrue(e instanceof DeveloperPortalAPIFailedError);
      }
    });
    it("Error - no data", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: undefined,
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(response);
      teamsDevPortalClient.setRegion("https://dev.teams.microsoft.com/amer");
      try {
        await teamsDevPortalClient.listApps(appStudioToken);
        chai.assert.fail("should throw error");
      } catch (e) {
        chai.assert.equal(e.message, "Cannot get the app definitions");
      }
    });
  });

  describe("delete Teams app", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      const response = {
        data: true,
      };
      sinon.stub(fakeAxiosInstance, "delete").resolves(response);
      teamsDevPortalClient.setRegion("https://dev.teams.microsoft.com/amer");
      const res = await teamsDevPortalClient.deleteApp(appStudioToken, "testid");
      chai.assert.isTrue(res);
    });
    it("Error - no region", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: [appDef],
      };
      sinon.stub(fakeAxiosInstance, "delete").resolves(response);
      teamsDevPortalClient.setRegion("");
      try {
        await teamsDevPortalClient.deleteApp(appStudioToken, "testid");
        chai.assert.fail("should throw error");
      } catch (e) {
        chai.assert.isTrue(e instanceof Error);
      }
    });
    it("Error - api failure", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      sinon.stub(fakeAxiosInstance, "delete").rejects(new Error());
      teamsDevPortalClient.setRegion("https://dev.teams.microsoft.com/amer");
      try {
        await teamsDevPortalClient.deleteApp(appStudioToken, "testid");
        chai.assert.fail("should throw error");
      } catch (e) {
        chai.assert.isTrue(e instanceof DeveloperPortalAPIFailedError);
      }
    });
    it("Error - no data", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const response = {
        data: undefined,
      };
      sinon.stub(fakeAxiosInstance, "delete").resolves(response);
      teamsDevPortalClient.setRegion("https://dev.teams.microsoft.com/amer");
      try {
        await teamsDevPortalClient.deleteApp(appStudioToken, "testid");
        chai.assert.fail("should throw error");
      } catch (e) {
        chai.assert.equal(e.message, "Cannot delete the app: " + "testid");
      }
    });
  });

  describe("Submit async app validation request", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      const response = {
        data: {
          appValidationId: uuid(),
          status: AsyncAppValidationStatus.Created,
        },
      };
      sinon.stub(fakeAxiosInstance, "post").resolves(response);
      const res = await teamsDevPortalClient.submitAppValidationRequest(appStudioToken, "fakeId");
      chai.assert.equal(res.appValidationId, response.data.appValidationId);
    });
  });

  describe("Get async app validation request list", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      const response = {
        data: {
          continuationToken: "",
          appValidations: [],
        },
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(response);
      const res = await teamsDevPortalClient.getAppValidationRequestList(appStudioToken, "fakeId");
      chai.assert.equal(res.appValidations!.length, 0);
    });

    it("404 not found", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "404",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "post").throws(error);

      try {
        await teamsDevPortalClient.submitAppValidationRequest(appStudioToken, "fakeId");
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("Get async app validation result details", () => {
    it("Happy path", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);
      const response = {
        data: {
          appValidationId: "fakeId",
          appId: "fakeAppId",
          status: AsyncAppValidationStatus.Completed,
          appVersion: "1.0.0",
          manifestVersion: "1.16",
          createdAt: Date(),
          updatedAt: Date(),
          validationResults: {
            successes: [],
            warnings: [],
            failures: [],
            skipped: [],
          },
        },
      };
      sinon.stub(fakeAxiosInstance, "get").resolves(response);
      const res = await teamsDevPortalClient.getAppValidationById(appStudioToken, "fakeId");
      chai.assert.equal(res.appValidationId, "fakeId");
    });

    it("404 not found", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "404",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "get").throws(error);

      try {
        await teamsDevPortalClient.getAppValidationRequestList(appStudioToken, "fakeId");
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
      }
    });

    it("404 not found", async () => {
      const fakeAxiosInstance = axios.create();
      sinon.stub(axios, "create").returns(fakeAxiosInstance);

      const error = {
        name: "404",
        message: "fake message",
      };
      sinon.stub(fakeAxiosInstance, "get").throws(error);

      try {
        await teamsDevPortalClient.getAppValidationById(appStudioToken, "fakeId");
      } catch (error) {
        chai.assert.equal(error.name, DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("getBotRegistration", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("Should return a valid bot registration", async () => {
      // Arrange
      sandbox.stub(RetryHandler, "Retry").resolves({
        status: 200,
        data: sampleBot,
      });
      // Act
      const res = await teamsDevPortalClient.getBotRegistration("anything", "anything");

      // Assert
      chai.assert.isTrue(res !== undefined);
      chai.assert.isTrue(res?.botId === sampleBot.botId);
    });

    it("Should return a undefined when 404 was throwed out", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "get").rejects({
        response: {
          status: 404,
        },
      });
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);

      // Act
      const res = await teamsDevPortalClient.getBotRegistration("anything", "anything");

      // Assert
      chai.assert.isUndefined(res);
    });

    it("Should throw NotAllowedToAcquireToken error when 401 was throwed out", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "get").rejects({
        response: {
          status: 401,
        },
      });
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await teamsDevPortalClient.getBotRegistration("anything", "anything");
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        chai.assert.isTrue(e.name === ErrorNames.ACQUIRE_BOT_FRAMEWORK_TOKEN_ERROR);
      }
    });

    it("Should throw DeveloperPortalAPIFailed error when other exceptions (500) were throwed out", async () => {
      // Arrange
      sandbox.stub(RetryHandler, "Retry").rejects({
        response: {
          headers: {
            "x-correlation-id": "anything",
          },
          status: 500,
        },
      });

      // Act & Assert
      try {
        await teamsDevPortalClient.getBotRegistration("anything", "anything");
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        chai.assert.isTrue(e.name === DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("createBotRegistration", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("Bot registration should be created successfully", async () => {
      // Arrange
      sandbox.stub(teamsDevPortalClient, "getBotRegistration").resolves(undefined);
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").resolves({
        status: 200,
        data: sampleBot,
      });
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await teamsDevPortalClient.createBotRegistration("anything", sampleBot);
      } catch (e) {
        chai.assert.fail(Messages.ShouldNotReachHere);
      }
    });

    it("Bot registration creation should be skipped (existing bot case).", async () => {
      // Arrange
      sandbox.stub(teamsDevPortalClient, "getBotRegistration").resolves(sampleBot);

      // Act & Assert
      try {
        await teamsDevPortalClient.createBotRegistration("anything", sampleBot);
      } catch (e) {
        chai.assert.fail(Messages.ShouldNotReachHere);
      }
    });

    it("BotFrameworkNotAllowedToAcquireToken error should be throwed out (401)", async () => {
      // Arrange
      sandbox.stub(teamsDevPortalClient, "getBotRegistration").resolves(undefined);
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").rejects({
        response: {
          status: 401,
        },
      });
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await teamsDevPortalClient.createBotRegistration("anything", sampleBot);
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        chai.assert.isTrue(e.name === ErrorNames.ACQUIRE_BOT_FRAMEWORK_TOKEN_ERROR);
      }
    });

    it("BotFrameworkForbiddenResult error should be throwed out (403)", async () => {
      // Arrange
      sandbox.stub(teamsDevPortalClient, "getBotRegistration").resolves(undefined);
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").rejects({
        response: {
          status: 403,
        },
      });
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await teamsDevPortalClient.createBotRegistration("anything", sampleBot);
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        chai.assert.isTrue(e.name === ErrorNames.FORBIDDEN_RESULT_BOT_FRAMEWORK_ERROR);
      }
    });

    it("BotFrameworkConflictResult error should be throwed out (429)", async () => {
      // Arrange
      sandbox.stub(teamsDevPortalClient, "getBotRegistration").resolves(undefined);
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").rejects({
        response: {
          status: 429,
        },
      });
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await teamsDevPortalClient.createBotRegistration("anything", sampleBot);
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        chai.assert.isTrue(e.name === ErrorNames.CONFLICT_RESULT_BOT_FRAMEWORK_ERROR);
      }
    });

    it("DeveloperPortalAPIFailed error should be throwed out (500)", async () => {
      // Arrange
      sandbox.stub(teamsDevPortalClient, "getBotRegistration").resolves(undefined);
      sandbox.stub(RetryHandler, "Retry").rejects({
        response: {
          headers: {
            "x-correlation-id": "anything",
          },
          status: 500,
        },
      });

      // Act & Assert
      try {
        await teamsDevPortalClient.createBotRegistration("anything", sampleBot);
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        chai.assert.isTrue(e.name === DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("updateBotRegistration", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("Bot registration should be updated successfully", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").resolves({
        status: 200,
        data: sampleBot,
      });
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await teamsDevPortalClient.updateBotRegistration("anything", sampleBot);
      } catch (e) {
        chai.assert.fail(Messages.ShouldNotReachHere);
      }
    });

    it("BotFrameworkNotAllowedToAcquireToken error should be throwed out (401)", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").rejects({
        response: {
          status: 401,
        },
      });
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await teamsDevPortalClient.updateBotRegistration("anything", sampleBot);
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        chai.assert.isTrue(e.name === ErrorNames.ACQUIRE_BOT_FRAMEWORK_TOKEN_ERROR);
      }
    });

    it("BotFrameworkForbiddenResult error should be throwed out (403)", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").rejects({
        response: {
          status: 403,
        },
      });
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await teamsDevPortalClient.updateBotRegistration("anything", sampleBot);
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        chai.assert.isTrue(e.name === ErrorNames.FORBIDDEN_RESULT_BOT_FRAMEWORK_ERROR);
      }
    });

    it("BotFrameworkConflictResult error should be throwed out (429)", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(mockAxiosInstance, "post").rejects({
        response: {
          status: 429,
        },
      });
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);

      // Act & Assert
      try {
        await teamsDevPortalClient.updateBotRegistration("anything", sampleBot);
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        chai.assert.isTrue(e.name === ErrorNames.CONFLICT_RESULT_BOT_FRAMEWORK_ERROR);
      }
    });

    it("DeveloperPortalAPIFailed error should be throwed out (500)", async () => {
      // Arrange
      sandbox.stub(RetryHandler, "Retry").rejects({
        response: {
          headers: {
            "x-correlation-id": "anything",
          },
          status: 500,
        },
      });

      // Act & Assert
      try {
        await teamsDevPortalClient.updateBotRegistration("anything", sampleBot);
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        chai.assert.isTrue(e.name === DeveloperPortalAPIFailedError.name);
      }
    });
  });

  describe("updateMessageEndpoint", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("Message endpoint should be updated successfully", async () => {
      // Arrange
      sandbox.stub(teamsDevPortalClient, "getBotRegistration").resolves(sampleBot);
      sandbox.stub(teamsDevPortalClient, "updateBotRegistration").resolves();
      // Act & Assert
      try {
        await teamsDevPortalClient.updateMessageEndpoint("anything", "anything", "anything");
      } catch (e) {
        chai.assert.fail(Messages.ShouldNotReachHere);
      }
    });

    it("BotRegistrationNotFound error should be throwed out", async () => {
      // Arrange
      sandbox.stub(teamsDevPortalClient, "getBotRegistration").resolves(undefined);
      // Act & Assert
      try {
        await teamsDevPortalClient.updateMessageEndpoint("anything", "anything", "anything");
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        chai.assert.isTrue(e.name === ErrorNames.BOT_REGISTRATION_NOTFOUND_ERROR);
      }
    });
  });

  describe("listBots", () => {
    afterEach(() => {
      sandbox.restore();
    });
    it("happy", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);
      sandbox.stub(mockAxiosInstance, "get").resolves({
        status: 200,
        data: [sampleBot],
      });
      // Act & Assert
      try {
        const res = await teamsDevPortalClient.listBots("anything");
        chai.assert.deepEqual(res, [sampleBot]);
      } catch (e) {
        chai.assert.fail(Messages.ShouldNotReachHere);
      }
    });
    it("invalid response", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);
      sandbox.stub(mockAxiosInstance, "get").resolves({
        status: 200,
      });
      // Act & Assert
      try {
        await teamsDevPortalClient.listBots("anything");
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {}
    });
    it("api failure", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);
      sandbox.stub(mockAxiosInstance, "get").resolves({ response: { status: 404 } });
      // Act & Assert
      try {
        await teamsDevPortalClient.listBots("anything");
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        chai.assert.isTrue(e instanceof DeveloperPortalAPIFailedError);
      }
    });
  });
  describe("deleteBot", () => {
    afterEach(() => {
      sandbox.restore();
    });
    it("happy", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);
      sandbox.stub(mockAxiosInstance, "delete").resolves({
        status: 200,
      });
      // Act & Assert
      try {
        await teamsDevPortalClient.deleteBot("anything", "anything");
      } catch (e) {
        chai.assert.fail(Messages.ShouldNotReachHere);
      }
    });
    it("api failure", async () => {
      // Arrange
      const mockAxiosInstance = axios.create();
      sandbox.stub(teamsDevPortalClient, "createRequesterWithToken").returns(mockAxiosInstance);
      sandbox.stub(mockAxiosInstance, "delete").resolves({ response: { status: 404 } });
      // Act & Assert
      try {
        await teamsDevPortalClient.deleteBot("anything", "anything");
        chai.assert.fail(Messages.ShouldNotReachHere);
      } catch (e) {
        chai.assert.isTrue(e instanceof Error);
      }
    });
  });
});
