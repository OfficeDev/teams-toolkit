// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import faker from "faker";
import { AadAppClient } from "../../../../../src/component/resource/aadApp/aadAppClient";
import { ProvisionConfig, Utils } from "../../../../../src/component/resource/aadApp/utils/configs";
import { TestHelper } from "../helper";
import { PluginContext, UserError, SystemError } from "@microsoft/teamsfx-api";
import {
  GraphAndAppStudioTokenProvider,
  TokenAudience,
  TokenProvider,
} from "../../../../../src/component/resource/aadApp/utils/tokenProvider";
import { GraphClient } from "../../../../../src/component/resource/aadApp/graph";
import {
  IAADDefinition,
  RequiredResourceAccess,
} from "../../../../../src/component/resource/aadApp/interfaces/IAADDefinition";
import { AppStudio } from "../../../../../src/component/resource/aadApp/appStudio";
import {
  CreateAppError,
  CreateAppForbiddenError,
  CreateSecretError,
  GetAppConfigError,
  GetAppError,
  UpdateAppIdUriError,
  UpdatePermissionError,
  UpdateRedirectUriError,
} from "../../../../../src/component/resource/aadApp/errors";
import { ConfigKeys, Constants } from "../../../../../src/component/resource/aadApp/constants";
import { MockM365TokenProvider, MockTools } from "../../../../core/utils";
import { setTools } from "../../../../../src/core/globalVars";
import { AadAppManifestManager } from "../../../../../src/component/resource/aadApp/aadAppManifestManager";
import * as tool from "../../../../../src/common/tools";

describe("AAD App Client Test", () => {
  let ctx: PluginContext;
  let config: ProvisionConfig;
  const mockTokenProviders: GraphAndAppStudioTokenProvider = {
    m365: new MockM365TokenProvider(),
  };
  beforeEach(async () => {
    setTools(new MockTools());
    ctx = await TestHelper.pluginContext(new Map(), true, false, false);
    config = new ProvisionConfig(true);
    config.restoreConfigFromContext(ctx);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("createAadAppUsingManifest", async () => {
    it("Happy Path", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();

      sinon
        .stub<any, any>(AadAppManifestManager, "createAadApp")
        .resolves({ appId: "fake-appId", id: objectId });

      await AadAppClient.createAadAppUsingManifest("createAADApp", {} as any, config);
      chai.assert.equal(config.objectId, objectId);
    });

    it("System Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);

      const error = {
        response: {
          status: 500,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);

      try {
        await AadAppClient.createAadAppUsingManifest("createAADApp", {} as any, config);
      } catch (error) {
        chai.assert.isTrue(error instanceof SystemError);
        chai.assert.equal(error.message, CreateAppError.message()[0]);
      }
    });

    it("User Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);

      const error = {
        response: {
          status: 404,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        await AadAppClient.createAadAppUsingManifest("createAADApp", {} as any, config);
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
        chai.assert.equal(error.message, CreateAppError.message()[0]);
      }
    });

    it("Forbidden", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);

      const error = {
        response: {
          status: 403,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        await AadAppClient.createAadAppUsingManifest("createAADApp", {} as any, config);
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
        chai.assert.equal(error.message, CreateAppForbiddenError.message()[0]);
      }
    });
  });

  describe("createAadApp", async () => {
    it("Happy Path: Graph", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const displayName = "createAADApp";

      sinon.stub(GraphClient, "createAADApp").resolves({
        id: objectId,
        displayName: displayName,
      });

      await AadAppClient.createAadApp("createAADApp", config);
      chai.assert.equal(config.objectId, objectId);
    });

    it("Happy Path: App Studio", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.AppStudio);
      const objectId = faker.datatype.uuid();
      const displayName = "createAADApp";

      sinon.stub(AppStudio, "createAADAppV2").resolves({
        id: objectId,
        displayName: displayName,
      });

      await AadAppClient.createAadApp("createAADApp", config);
      chai.assert.equal(config.objectId, objectId);
    });

    it("System Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);

      const error = {
        response: {
          status: 500,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        await AadAppClient.createAadApp("createAADApp", config);
      } catch (error) {
        chai.assert.isTrue(error instanceof SystemError);
        chai.assert.equal(error.message, CreateAppError.message()[0]);
      }
    });

    it("User Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);

      const error = {
        response: {
          status: 404,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        await AadAppClient.createAadApp("createAADApp", config);
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
        chai.assert.equal(error.message, CreateAppError.message()[0]);
      }
    });
  });

  describe("createAadAppSecret", () => {
    it("Happy Path: Graph", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      sinon.stub(GraphClient, "createAadAppSecret").resolves({
        hint: "hint",
        id: faker.datatype.uuid(),
        endDate: "endDate",
        startDate: "startDate",
        value: "secret",
      });

      await AadAppClient.createAadAppSecret("createAadAppSecret", config);
      chai.assert.equal(config.password, "secret");
    });

    it("Happy Path: App Studio", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.AppStudio);
      sinon.stub(AppStudio, "createAADAppPassword").resolves({
        hint: "hint",
        id: faker.datatype.uuid(),
        endDate: "endDate",
        startDate: "startDate",
        value: "secret",
      });

      await AadAppClient.createAadAppSecret("createAadAppSecret", config);
      chai.assert.equal(config.password, "secret");
    });

    it("System Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);

      const error = {
        response: {
          status: 500,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        await AadAppClient.createAadAppSecret("createAadAppSecret", config);
      } catch (error) {
        chai.assert.isTrue(error instanceof SystemError);
        chai.assert.equal(error.message, CreateSecretError.message()[0]);
      }
    });

    it("User Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);

      const error = {
        response: {
          status: 404,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        await AadAppClient.createAadAppSecret("createAadAppSecret", config);
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
        chai.assert.equal(error.message, CreateSecretError.message()[0]);
      }
    });
  });

  describe("updateAadUsingManifest", () => {
    it("Happy Path", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      sinon
        .stub<any, any>(AadAppManifestManager, "updateAadApp")
        .resolves({ appId: "fake-appId", id: objectId });

      await AadAppClient.updateAadAppUsingManifest("updateAadApp", {} as any);
    });

    it("System Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const err: any = new Error("create AAD failed");
      err.response = {
        status: 500,
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(err);
      try {
        await AadAppClient.updateAadAppUsingManifest("updateAadApp", {} as any);
      } catch (error) {
        chai.assert.isTrue(error instanceof SystemError);
        chai.assert.isTrue(error.message.indexOf("create AAD failed") > 0);
      }
    });

    it("User Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const err: any = new Error("create AAD failed");
      err.response = {
        status: 404,
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(err);
      try {
        await AadAppClient.updateAadAppUsingManifest("updateAadApp", {} as any);
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
        chai.assert.isTrue(error.message.indexOf("create AAD failed") > 0);
      }
    });

    it("Bad Request", async () => {
      sinon.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const err: any = new Error("create AAD failed");
      err.response = {
        status: 400,
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(err);
      try {
        await AadAppClient.updateAadAppUsingManifest("updateAadApp", {} as any);
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
        chai.assert.isTrue(error.message.indexOf("templates/appPackage/aad.template.json") > 0);
      }
    });
  });

  describe("updateAadAppRedirectUri", () => {
    it("Happy Path: Graph", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const redirectUris: IAADDefinition = {
        web: {
          redirectUris: ["redirectUri"],
        },
      };

      sinon.stub(GraphClient, "updateAADApp").resolves();
      await AadAppClient.updateAadAppRedirectUri("updateAadAppRedirectUri", objectId, redirectUris);
    });

    it("Happy Path: App Studio", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.AppStudio);
      const objectId = faker.datatype.uuid();
      const redirectUris: IAADDefinition = {
        web: {
          redirectUris: ["redirectUri"],
        },
      };

      sinon.stub(AppStudio, "updateAADApp").resolves();
      await AadAppClient.updateAadAppRedirectUri("updateAadAppRedirectUri", objectId, redirectUris);
    });

    it("System Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const redirectUris: IAADDefinition = {
        web: {
          redirectUris: ["redirectUri"],
        },
      };

      const error = {
        response: {
          status: 500,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        await AadAppClient.updateAadAppRedirectUri(
          "updateAadAppRedirectUri",
          objectId,
          redirectUris
        );
      } catch (error) {
        chai.assert.isTrue(error instanceof SystemError);
        chai.assert.equal(error.message, UpdateRedirectUriError.message()[0]);
      }
    });

    it("User Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const redirectUris: IAADDefinition = {
        web: {
          redirectUris: ["redirectUri"],
        },
      };

      const error = {
        response: {
          status: 404,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        await AadAppClient.updateAadAppRedirectUri(
          "updateAadAppRedirectUri",
          objectId,
          redirectUris
        );
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
        chai.assert.equal(error.message, UpdateRedirectUriError.message()[0]);
      }
    });
  });

  describe("updateAadAppIdUri", () => {
    it("Happy Path: Graph", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const applicationIdUri = "applicationIdUri";

      sinon.stub(GraphClient, "updateAADApp").resolves();
      await AadAppClient.updateAadAppIdUri("updateAadAppIdUri", objectId, applicationIdUri);
    });

    it("Happy Path: App Studio", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.AppStudio);
      const objectId = faker.datatype.uuid();
      const applicationIdUri = "applicationIdUri";

      sinon.stub(AppStudio, "updateAADApp").resolves();
      await AadAppClient.updateAadAppIdUri("updateAadAppIdUri", objectId, applicationIdUri);
    });

    it("System Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const applicationIdUri = "applicationIdUri";

      const error = {
        response: {
          status: 500,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        await AadAppClient.updateAadAppIdUri("updateAadAppIdUri", objectId, applicationIdUri);
      } catch (error) {
        chai.assert.isTrue(error instanceof SystemError);
        chai.assert.equal(error.message, UpdateAppIdUriError.message()[0]);
      }
    });

    it("User Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const applicationIdUri = "applicationIdUri";

      const error = {
        response: {
          status: 404,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        await AadAppClient.updateAadAppIdUri("updateAadAppIdUri", objectId, applicationIdUri);
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
        chai.assert.equal(error.message, UpdateAppIdUriError.message()[0]);
      }
    });
  });

  describe("updateAadAppPermission", () => {
    it("Happy Path: Graph", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const permissions: RequiredResourceAccess[] = [{}];

      sinon.stub(GraphClient, "updateAADApp").resolves();
      await AadAppClient.updateAadAppPermission("updateAadAppPermission", objectId, permissions);
    });

    it("Happy Path: AppStudio", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.AppStudio);
      const objectId = faker.datatype.uuid();
      const permissions: RequiredResourceAccess[] = [{}];

      sinon.stub(AppStudio, "updateAADApp").resolves();
      await AadAppClient.updateAadAppPermission("updateAadAppPermission", objectId, permissions);
    });

    it("System Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const permissions: RequiredResourceAccess[] = [{}];

      const error = {
        response: {
          status: 500,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        await AadAppClient.updateAadAppPermission("updateAadAppPermission", objectId, permissions);
      } catch (error) {
        chai.assert.isTrue(error instanceof SystemError);
        chai.assert.equal(error.message, UpdatePermissionError.message()[0]);
      }
    });

    it("User Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const permissions: RequiredResourceAccess[] = [{}];

      const error = {
        response: {
          status: 404,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        await AadAppClient.updateAadAppPermission("updateAadAppPermission", objectId, permissions);
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
        chai.assert.equal(error.message, UpdatePermissionError.message()[0]);
      }
    });
  });

  describe("getAadAppUsingManifest", async () => {
    it("Happy Path", async () => {
      const objectId = faker.datatype.uuid();
      const clientId = faker.datatype.uuid();
      const oauth2PermissionScopeId = faker.datatype.uuid();
      const secret = "secret";
      const displayName = "getAadApp";

      sinon.stub<any, any>(AadAppManifestManager, "getAadAppManifest").resolves({
        id: objectId,
        appId: clientId,
        name: displayName,
        oauth2Permissions: [
          {
            adminConsentDescription: "Allows Teams to call the app's web APIs as the current user.",
            adminConsentDisplayName: "Teams can access app's web APIs",
            id: oauth2PermissionScopeId,
            isEnabled: true,
            type: "User",
            userConsentDescription:
              "Enable Teams to call this app's web APIs with the same rights that you have",
            userConsentDisplayName:
              "Teams can access app's web APIs and make requests on your behalf",
            value: "access_as_user",
          },
        ],
      });

      const getResult = await AadAppClient.getAadAppUsingManifest(
        "getAadApp",
        objectId,
        secret,
        oauth2PermissionScopeId,
        new MockM365TokenProvider()
      );
      chai.assert.equal(getResult.objectId, objectId);
      chai.assert.equal(getResult.clientId, clientId);
    });

    it("use existing scope id", async () => {
      const objectId = faker.datatype.uuid();
      const clientId = faker.datatype.uuid();
      const existingScopeId = faker.datatype.uuid();
      const fileName = "fileName";
      const secret = "secret";
      const displayName = "getAadApp";

      sinon.stub<any, any>(AadAppManifestManager, "getAadAppManifest").resolves({
        id: objectId,
        appId: clientId,
        name: displayName,
        oauth2Permissions: [],
      });
      sinon.stub(Utils, "getConfigFileName").returns(fileName);

      const getResult = await AadAppClient.getAadAppUsingManifest(
        "getAadApp",
        objectId,
        secret,
        existingScopeId,
        new MockM365TokenProvider()
      );

      chai.assert.equal(getResult.oauth2PermissionScopeId, existingScopeId);
    });

    it("System Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const tenantId = faker.datatype.uuid();
      const fileName = "fileName";
      const secret = "secret";

      const error = {
        response: {
          status: 500,
          message: "errorMessage",
        },
      };

      sinon.stub<any, any>(AadAppManifestManager, "getAadAppManifest").throws(error);
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      sinon.stub(Utils, "getCurrentTenantId").resolves(tenantId);
      sinon.stub(Utils, "getConfigFileName").returns(fileName);
      try {
        const getResult = await AadAppClient.getAadAppUsingManifest(
          "getAadApp",
          objectId,
          secret,
          undefined,
          new MockM365TokenProvider()
        );
      } catch (error) {
        chai.assert.isTrue(error instanceof SystemError);
        chai.assert.equal(error.message, GetAppError.message(objectId, tenantId, fileName)[0]);
      }
    });

    it("User Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const tenantId = faker.datatype.uuid();
      const fileName = "fileName";
      const secret = "secret";

      const error = {
        response: {
          status: 404,
          message: "errorMessage",
        },
      };

      sinon.stub<any, any>(AadAppManifestManager, "getAadAppManifest").throws(error);
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      sinon.stub(Utils, "getCurrentTenantId").resolves(tenantId);
      sinon.stub(Utils, "getConfigFileName").returns(fileName);
      try {
        const getResult = await AadAppClient.getAadAppUsingManifest(
          "getAadApp",
          objectId,
          secret,
          undefined,
          new MockM365TokenProvider()
        );
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
        chai.assert.equal(error.message, GetAppError.message(objectId, tenantId, fileName)[0]);
      }
    });
  });

  describe("getAadApp", async () => {
    it("Happy Path: Graph", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const clientId = faker.datatype.uuid();
      const oauth2PermissionScopeId = faker.datatype.uuid();
      const secret = "secret";
      const displayName = "getAadApp";

      sinon.stub(GraphClient, "getAadApp").resolves({
        id: objectId,
        appId: clientId,
        displayName: displayName,
        api: {
          requestedAccessTokenVersion: 0,
          oauth2PermissionScopes: [
            {
              id: oauth2PermissionScopeId,
              adminConsentDescription: "adminConsentDescription",
              adminConsentDisplayName: "adminConsentDisplayName",
              isEnabled: true,
              type: "type",
              userConsentDescription: "userConsentDescription",
              userConsentDisplayName: "userConsentDescription",
              value: "value",
            },
          ],
          preAuthorizedApplications: [],
        },
      });

      const getResult = await AadAppClient.getAadApp(
        "getAadApp",
        objectId,
        secret,
        new MockM365TokenProvider()
      );
      chai.assert.equal(getResult.objectId, objectId);
      chai.assert.equal(getResult.clientId, clientId);
    });

    it("Happy Path: App Studio", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.AppStudio);
      const objectId = faker.datatype.uuid();
      const clientId = faker.datatype.uuid();
      const oauth2PermissionScopeId = faker.datatype.uuid();
      const secret = "secret";
      const displayName = "getAadApp";

      sinon.stub(AppStudio, "getAadApp").resolves({
        id: objectId,
        appId: clientId,
        displayName: displayName,
        api: {
          requestedAccessTokenVersion: 0,
          oauth2PermissionScopes: [
            {
              id: oauth2PermissionScopeId,
              adminConsentDescription: "adminConsentDescription",
              adminConsentDisplayName: "adminConsentDisplayName",
              isEnabled: true,
              type: "type",
              userConsentDescription: "userConsentDescription",
              userConsentDisplayName: "userConsentDescription",
              value: "value",
            },
          ],
          preAuthorizedApplications: [],
        },
      });

      const getResult = await AadAppClient.getAadApp(
        "getAadApp",
        objectId,
        secret,
        new MockM365TokenProvider()
      );
      chai.assert.equal(getResult.objectId, objectId);
      chai.assert.equal(getResult.clientId, clientId);
    });

    it("throw GetAppConfigError", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.AppStudio);
      const objectId = faker.datatype.uuid();
      const clientId = faker.datatype.uuid();
      const secret = "secret";
      const displayName = "getAadApp";

      const tenantId = faker.datatype.uuid();
      const fileName = "fileName";
      sinon.stub(Utils, "getCurrentTenantId").resolves(tenantId);
      sinon.stub(Utils, "getConfigFileName").returns(fileName);

      sinon.stub(AppStudio, "getAadApp").resolves({
        id: objectId,
        appId: clientId,
        displayName: displayName,
        api: {
          requestedAccessTokenVersion: 0,
          oauth2PermissionScopes: [],
          preAuthorizedApplications: [],
        },
      });

      try {
        const getResult = await AadAppClient.getAadApp(
          "getAadApp",
          objectId,
          secret,
          new MockM365TokenProvider()
        );
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
        chai.assert.equal(
          error.message,
          GetAppConfigError.message(ConfigKeys.oauth2PermissionScopeId, fileName)[0]
        );
      }
    });

    it("System Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const tenantId = faker.datatype.uuid();
      const fileName = "fileName";
      const secret = "secret";

      const error = {
        response: {
          status: 500,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      sinon.stub(Utils, "getCurrentTenantId").resolves(tenantId);
      sinon.stub(Utils, "getConfigFileName").returns(fileName);
      try {
        const getResult = await AadAppClient.getAadApp(
          "getAadApp",
          objectId,
          secret,
          new MockM365TokenProvider()
        );
      } catch (error) {
        chai.assert.isTrue(error instanceof SystemError);
        chai.assert.equal(error.message, GetAppError.message(objectId, tenantId, fileName)[0]);
      }
    });

    it("User Error", async () => {
      TokenProvider.init(mockTokenProviders, TokenAudience.Graph);
      const objectId = faker.datatype.uuid();
      const tenantId = faker.datatype.uuid();
      const fileName = "fileName";
      const secret = "secret";

      const error = {
        response: {
          status: 404,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      sinon.stub(Utils, "getCurrentTenantId").resolves(tenantId);
      sinon.stub(Utils, "getConfigFileName").returns(fileName);
      try {
        const getResult = await AadAppClient.getAadApp(
          "getAadApp",
          objectId,
          secret,
          new MockM365TokenProvider()
        );
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
        chai.assert.equal(error.message, GetAppError.message(objectId, tenantId, fileName)[0]);
      }
    });
  });

  describe("checkPermission", async () => {
    it("Happy Path", async () => {
      sinon.stub(GraphClient, "checkPermission").resolves(true);
      const checkPermissionResult = await AadAppClient.checkPermission(
        "checkPermission",
        faker.datatype.uuid(),
        faker.datatype.uuid()
      );
      chai.assert.equal(checkPermissionResult, true);
    });

    it("User Error", async () => {
      const error = {
        response: {
          status: 404,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        const checkPermissionResult = await AadAppClient.checkPermission(
          "checkPermission",
          faker.datatype.uuid(),
          faker.datatype.uuid()
        );
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
      }
    });

    it("System Error", async () => {
      const error = {
        response: {
          status: 500,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        const checkPermissionResult = await AadAppClient.checkPermission(
          "checkPermission",
          faker.datatype.uuid(),
          faker.datatype.uuid()
        );
      } catch (error) {
        chai.assert.isTrue(error instanceof SystemError);
      }
    });
  });

  describe("grantPermission", async () => {
    it("Happy Path", async () => {
      sinon.stub(GraphClient, "grantPermission").resolves();
      const grantPermissionResult = await AadAppClient.grantPermission(
        ctx,
        faker.datatype.uuid(),
        faker.datatype.uuid()
      );
    });

    it("User Error", async () => {
      const error = {
        response: {
          status: 404,
          message: "errorMessage",
        },
      };
      sinon.stub(GraphClient, "grantPermission").throws(error);
      try {
        const grantPermissionResult = await AadAppClient.grantPermission(
          ctx,
          faker.datatype.uuid(),
          faker.datatype.uuid()
        );
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
      }
    });

    it("System Error", async () => {
      const error = {
        response: {
          status: 500,
          message: "errorMessage",
        },
      };
      sinon.stub(GraphClient, "grantPermission").throws(error);
      try {
        const grantPermissionResult = await AadAppClient.grantPermission(
          ctx,
          faker.datatype.uuid(),
          faker.datatype.uuid()
        );
      } catch (error) {
        chai.assert.isTrue(error instanceof SystemError);
      }
    });

    it("Create owner duplicated without throw error", async () => {
      const error = {
        response: {
          status: 404,
          data: {
            error: {
              message: Constants.createOwnerDuplicatedMessage,
            },
          },
        },
      };
      sinon.stub(GraphClient, "grantPermission").throws(error);
      const grantPermissionResult = await AadAppClient.grantPermission(
        ctx,
        faker.datatype.uuid(),
        faker.datatype.uuid()
      );
    });
  });

  describe("listCollaborator", async () => {
    it("Happy Path", async () => {
      sinon.stub(GraphClient, "getAadOwners").resolves([
        {
          userObjectId: "id",
          displayName: "displayName",
          userPrincipalName: "userPrincipalName",
          resourceId: "resourceId",
        },
      ]);
      const listCollaboratorResult = await AadAppClient.listCollaborator(
        "listCollaborator",
        faker.datatype.uuid()
      );

      chai.assert.equal(listCollaboratorResult![0].userObjectId, "id");
    });

    it("User Error", async () => {
      const error = {
        response: {
          status: 404,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        const listCollaboratorResult = await AadAppClient.listCollaborator(
          "listCollaborator",
          faker.datatype.uuid()
        );
      } catch (error) {
        chai.assert.isTrue(error instanceof UserError);
      }
    });

    it("System Error", async () => {
      const error = {
        response: {
          status: 500,
          message: "errorMessage",
        },
      };
      sinon.stub(AadAppClient, "retryHanlder").throws(error);
      try {
        const listCollaboratorResult = await AadAppClient.listCollaborator(
          "listCollaborator",
          faker.datatype.uuid()
        );
      } catch (error) {
        chai.assert.isTrue(error instanceof SystemError);
      }
    });
  });
});
