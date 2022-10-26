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
import { MockTools } from "../../../../core/utils";
import { AppUser } from "../../../../../src/component/resource/appManifest/interfaces/appUser";
import { AadAppClient } from "../../../../../src/component/resource/aadApp/aadAppClient";
import { Inputs, Platform, ResourceContextV3 } from "@microsoft/teamsfx-api";
import { InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { AadAppManifestManager } from "../../../../../src/component/resource/aadApp/aadAppManifestManager";
import mockedEnv, { RestoreFn } from "mocked-env";
import { FeatureFlagName } from "../../../../../src/common/constants";

describe("aadApp", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);

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

  it("build aad manifest", async function () {
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

    const inputs: Inputs = {
      projectPath: "mock-path",
      platform: Platform.VSCode,
    };
    inputs.env = "dev";

    sandbox.stub(AadAppManifestManager, "loadAadManifest").resolves({ id: "fake-aad-id" } as any);
    sandbox.stub(AadAppManifestManager, "writeManifestFileToBuildFolder").resolves();
    const aadApp = new AadApp();
    const res = await aadApp.buildAadManifest(
      ctx as ResourceContextV3,
      inputs as InputsWithProjectPath
    );
    chai.assert.isFalse(res.isErr());
  });

  describe("collaboration v3", () => {
    let mockedEnvRestore: RestoreFn;
    before(() => {
      mockedEnvRestore = mockedEnv({
        [FeatureFlagName.V3]: "true",
      });
    });
    afterEach(() => {
      sandbox.restore();
    });
    after(() => {
      sandbox.restore();
      mockedEnvRestore();
    });

    it("list collaborator v3", async function () {
      sandbox
        .stub(AadAppClient, "listCollaborator")
        .callsFake(async (stage: string, objectId: string) => {
          return [
            {
              userObjectId: objectId,
              displayName: "displayName",
              userPrincipalName: "userPrincipalName",
              resourceId: "resourceId",
            },
          ];
        });
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
          solution: {},
        },
        config: {},
      };
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };

      const aadApp = new AadApp();
      const res = await aadApp.listCollaborator(ctx, "aadObjectId");
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.equal(res.value[0].userObjectId, "aadObjectId");
      }
    });

    it("grant permission v3", async function () {
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
          solution: {},
        },
        config: {},
      };
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };

      const aadApp = new AadApp();
      const res = await aadApp.grantPermission(ctx, userList, "aadObjectId");
      chai.assert.isTrue(res.isOk());
    });

    it("check permission v3", async function () {
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
          solution: {},
        },
        config: {},
      };
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };

      const aadApp = new AadApp();
      const res = await aadApp.checkPermission(ctx, userList, "aadObjectId");
      if (res.isErr()) {
        console.log(res.error);
      }
      chai.assert.isTrue(res.isOk());
    });
  });
});
