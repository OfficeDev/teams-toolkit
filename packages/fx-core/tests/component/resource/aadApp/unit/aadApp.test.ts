// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import { createContextV3 } from "../../../../../src/component/utils";
import { ComponentNames } from "../../../../../src/component/constants";
import faker from "faker";
import { MockedAzureAccountProvider, MockedM365Provider } from "../../../../plugins/solution/util";
import { AadApp } from "../../../../../src/component/resource/aadApp/aadApp";
import { setTools } from "../../../../../src/core/globalVars";
import { MockTools, randomAppName } from "../../../../core/utils";
import { AppUser } from "../../../../../src/component/resource/appManifest/interfaces/appUser";
import { AadAppClient } from "../../../../../src/component/resource/aadApp/aadAppClient";
import { InputsWithProjectPath, ok, Platform } from "@microsoft/teamsfx-api";
import path from "path";
import * as os from "os";
import * as utils from "../../../../../src/component/resource/aadApp/utils";

describe("aadApp", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);

  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const inputs: InputsWithProjectPath = {
    projectPath: projectPath,
    platform: Platform.VSCode,
    language: "typescript",
    "app-name": appName,
  };

  const userList: AppUser = {
    tenantId: faker.datatype.uuid(),
    aadId: faker.datatype.uuid(),
    displayName: "displayName",
    userPrincipalName: "userPrincipalName",
    isAdministrator: true,
  };

  const ctx = createContextV3();
  afterEach(() => {
    sandbox.restore();
  });

  it("list collaborator success", () => {
    it("list collaborator success", async function () {
      sandbox.stub(AadAppClient, "listCollaborator").resolves([
        {
          userObjectId: "id",
          displayName: "displayName",
          userPrincipalName: "userPrincipalName",
          resourceId: "resourceId",
        },
      ]);
      ctx.projectSetting.components = [
        {
          name: "teams-app",
          hosting: "azure-storage",
          sso: true,
        },
        {
          name: "aad-app",
          provision: true,
        },
        {
          name: "identity",
          provision: true,
        },
      ];
      ctx.envInfo = {
        envName: "dev",
        state: {
          solution: { provisionSucceeded: true },
          [ComponentNames.AppManifest]: { tenantId: "mock_project_tenant_id" },
          [ComponentNames.AadApp]: { objectId: faker.datatype.uuid() },
        },
        config: {},
      };
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };

      const aadApp = new AadApp();
      const res = await aadApp.listCollaborator(ctx);
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.equal(res.value[0].userObjectId, "id");
      }
    });
  });

  it("list collaborator error", async function () {
    ctx.projectSetting.components = [
      {
        name: "teams-app",
        hosting: "azure-storage",
        sso: true,
      },
      {
        name: "aad-app",
        provision: true,
      },
      {
        name: "identity",
        provision: true,
      },
    ];
    ctx.envInfo = {
      envName: "dev",
      state: {
        solution: { provisionSucceeded: true },
        [ComponentNames.AppManifest]: { tenantId: "mock_project_tenant_id" },
        [ComponentNames.AadApp]: {},
      },
      config: {},
    };
    ctx.tokenProvider = {
      m365TokenProvider: new MockedM365Provider(),
      azureAccountProvider: new MockedAzureAccountProvider(),
    };

    const aadApp = new AadApp();
    const res = await aadApp.listCollaborator(ctx);
    chai.assert.isTrue(res.isErr());
  });

  it("check permission success", async function () {
    sandbox.stub(AadAppClient, "checkPermission").resolves(true);
    ctx.projectSetting.components = [
      {
        name: "teams-app",
        hosting: "azure-storage",
        sso: true,
      },
      {
        name: "aad-app",
        provision: true,
      },
      {
        name: "identity",
        provision: true,
      },
    ];
    ctx.envInfo = {
      envName: "dev",
      state: {
        solution: { provisionSucceeded: true },
        [ComponentNames.AppManifest]: { tenantId: "mock_project_tenant_id" },
        [ComponentNames.AadApp]: { objectId: faker.datatype.uuid() },
      },
      config: {},
    };
    ctx.tokenProvider = {
      m365TokenProvider: new MockedM365Provider(),
      azureAccountProvider: new MockedAzureAccountProvider(),
    };

    const aadApp = new AadApp();
    const res = await aadApp.checkPermission(ctx, userList);
    if (res.isErr()) {
      console.log(res.error);
    }
    chai.assert.isTrue(res.isOk());
  });

  it("check permission error", async function () {
    ctx.projectSetting.components = [
      {
        name: "teams-app",
        hosting: "azure-storage",
        sso: true,
      },
      {
        name: "aad-app",
        provision: true,
      },
      {
        name: "identity",
        provision: true,
      },
    ];
    ctx.envInfo = {
      envName: "dev",
      state: {
        solution: { provisionSucceeded: true },
        [ComponentNames.AppManifest]: { tenantId: "mock_project_tenant_id" },
        [ComponentNames.AadApp]: {},
      },
      config: {},
    };
    ctx.tokenProvider = {
      m365TokenProvider: new MockedM365Provider(),
      azureAccountProvider: new MockedAzureAccountProvider(),
    };

    const aadApp = new AadApp();
    const res = await aadApp.checkPermission(ctx, userList);
    chai.assert.isTrue(res.isErr());
  });

  it("grant permission success", async function () {
    sandbox.stub(AadAppClient, "grantPermission").resolves();
    ctx.projectSetting.components = [
      {
        name: "teams-app",
        hosting: "azure-storage",
        sso: true,
      },
      {
        name: "aad-app",
        provision: true,
      },
      {
        name: "identity",
        provision: true,
      },
    ];
    ctx.envInfo = {
      envName: "dev",
      state: {
        solution: { provisionSucceeded: true },
        [ComponentNames.AppManifest]: { tenantId: "mock_project_tenant_id" },
        [ComponentNames.AadApp]: { objectId: faker.datatype.uuid() },
      },
      config: {},
    };
    ctx.tokenProvider = {
      m365TokenProvider: new MockedM365Provider(),
      azureAccountProvider: new MockedAzureAccountProvider(),
    };

    const aadApp = new AadApp();
    const res = await aadApp.grantPermission(ctx, userList);
    chai.assert.isTrue(res.isOk());
  });

  it("grant permission error", async function () {
    ctx.projectSetting.components = [
      {
        name: "teams-app",
        hosting: "azure-storage",
        sso: true,
      },
      {
        name: "aad-app",
        provision: true,
      },
      {
        name: "identity",
        provision: true,
      },
    ];
    ctx.envInfo = {
      envName: "dev",
      state: {
        solution: { provisionSucceeded: true },
        [ComponentNames.AppManifest]: { tenantId: "mock_project_tenant_id" },
        [ComponentNames.AadApp]: {},
      },
      config: {},
    };
    ctx.tokenProvider = {
      m365TokenProvider: new MockedM365Provider(),
      azureAccountProvider: new MockedAzureAccountProvider(),
    };

    const aadApp = new AadApp();
    const res = await aadApp.grantPermission(ctx, userList);
    chai.assert.isTrue(res.isErr());
  });

  it("generateAuthFiles with me", async function () {
    sandbox.stub(utils, "createAuthFiles").resolves(ok(undefined));
    ctx.projectSetting.components = [
      {
        name: "teams-bot",
        hosting: "azure-web-app",
        provision: false,
        deploy: true,
        capabilities: ["message-extension"],
        build: true,
        folder: "bot",
        sso: true,
      },
      {
        name: "bot-service",
        provision: true,
      },
      {
        name: "azure-web-app",
        scenario: "Bot",
        connections: ["teams-bot"],
      },
    ];

    const aadApp = new AadApp();
    const res = await aadApp.generateAuthFiles(ctx, inputs, false, true);
    chai.assert.isTrue(res.isOk());
  });
});
