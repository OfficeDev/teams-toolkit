// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import faker from "faker";
import { AadAppClient } from "../../../../../src/component/resource/aadApp/aadAppClient";
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
import {
  CreateAppError,
  CreateSecretError,
} from "../../../../../src/component/resource/aadApp/errors";
import { ConfigKeys, Constants } from "../../../../../src/component/resource/aadApp/constants";
import { MockM365TokenProvider, MockTools } from "../../../../core/utils";
import { setTools } from "../../../../../src/core/globalVars";

import * as tool from "../../../../../src/common/tools";

describe("AAD App Client Test", () => {
  let ctx: PluginContext;
  const mockTokenProviders: GraphAndAppStudioTokenProvider = {
    m365: new MockM365TokenProvider(),
  };
  beforeEach(async () => {
    setTools(new MockTools());
    ctx = await TestHelper.pluginContext(new Map(), true, false, false);
  });

  afterEach(() => {
    sinon.restore();
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
