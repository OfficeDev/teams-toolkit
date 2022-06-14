// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import { TeamsAppSolution } from " ../../../src/plugins/solution";
import {
  ConfigMap,
  SolutionConfig,
  SolutionContext,
  Platform,
  ok,
  PluginContext,
  Result,
  FxError,
  err,
  M365TokenProvider,
} from "@microsoft/teamsfx-api";
import {
  GLOBAL_CONFIG,
  PluginNames,
  REMOTE_TEAMS_APP_TENANT_ID,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../../../src/plugins/solution/fx-solution/constants";
import {
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
} from "../../../src/plugins/solution/fx-solution/question";
import * as uuid from "uuid";
import sinon from "sinon";
import { EnvConfig, MockM365TokenProvider } from "../resource/apim/testUtil";
import { CollaborationState } from "../../../src/common/permissionInterface";
import { newEnvInfo } from "../../../src";
import { LocalCrypto } from "../../../src/core/crypto";
import { CollaborationUtil } from "../../../src/plugins/solution/fx-solution/v2/collaborationUtil";
import { aadPlugin, appStudioPlugin } from "../../constants";
import { UserError } from "../../../../api/src/error";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("listCollaborator() for Teamsfx projects", () => {
  const sandbox = sinon.createSandbox();
  const mockProjectTenantId = "mock_project_tenant_id";

  function mockSolutionContext(): SolutionContext {
    const config: SolutionConfig = new Map();
    config.set(GLOBAL_CONFIG, new ConfigMap());
    const mockM365TokenProvider = new MockM365TokenProvider(
      mockProjectTenantId,
      EnvConfig.servicePrincipalClientId,
      EnvConfig.servicePrincipalClientSecret
    );
    return {
      root: ".",
      envInfo: newEnvInfo(),
      answers: { platform: Platform.VSCode },
      projectSettings: undefined,
      m365TokenProvider: mockM365TokenProvider,
      cryptoProvider: new LocalCrypto(""),
    };
  }

  afterEach(() => {
    sandbox.restore();
  });

  it("should return NotProvisioned state if Teamsfx project hasn't been provisioned", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();

    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
      },
    };

    sandbox.stub(CollaborationUtil, "getUserInfo").resolves({
      tenantId: "fake_tid",
      aadId: "fake_oid",
      userPrincipalName: "fake_unique_name",
      displayName: "displayName",
      isAdministrator: true,
    });

    const result = await solution.listCollaborator(mockedCtx);
    if (result.isErr()) {
      console.log(`!!! ${result.error.name}: ${result.error.message}`);
    }
    expect(result.isErr()).to.be.false;
    if (!result.isErr()) {
      expect(result.value.state).equals(CollaborationState.NotProvisioned);
    }
  });

  it("should return error if cannot get user info", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();

    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
      },
    };
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);

    sandbox
      .stub(mockedCtx.m365TokenProvider as M365TokenProvider, "getJsonObject")
      .resolves(err(new UserError("source", "name", "message")));

    const result = await solution.listCollaborator(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.FailedToRetrieveUserInfo);
  });

  it("should return M365TenantNotMatch state if tenant is not match", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();

    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
      },
    };
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);

    sandbox.stub(mockedCtx.m365TokenProvider as M365TokenProvider, "getJsonObject").resolves(
      ok({
        tid: "fake_tid",
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      })
    );

    mockedCtx.envInfo.state
      .get(PluginNames.SOLUTION)
      ?.set(REMOTE_TEAMS_APP_TENANT_ID, mockProjectTenantId);

    const result = await solution.listCollaborator(mockedCtx);
    expect(result.isErr()).to.be.false;
    if (!result.isErr()) {
      expect(result.value.state).equals(CollaborationState.M365TenantNotMatch);
    }
  });

  it("should return error if list collaborator failed", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();

    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
      },
    };
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);

    sandbox.stub(mockedCtx.m365TokenProvider as M365TokenProvider, "getJsonObject").resolves(
      ok({
        tid: mockProjectTenantId,
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      })
    );

    appStudioPlugin.listCollaborator = async function (
      _ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return err(
        new UserError(
          "AppStudioPlugin",
          SolutionError.FailedToListCollaborator,
          "List collaborator failed."
        )
      );
    };

    aadPlugin.listCollaborator = async function (
      _ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return ok([
        {
          id: "fake-aad-user-object-id",
          displayName: "fake-display-name",
          userPrincipalName: "fake-user-principal-name",
        },
      ]);
    };

    mockedCtx.envInfo.state
      .get(PluginNames.SOLUTION)
      ?.set(REMOTE_TEAMS_APP_TENANT_ID, mockProjectTenantId);

    const result = await solution.listCollaborator(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.FailedToListCollaborator);
  });

  it("happy path", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();

    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [
          "fx-resource-frontend-hosting",
          "fx-resource-identity",
          "fx-resource-aad-app-for-teams",
          "fx-resource-local-debug",
          "fx-resource-appstudio",
          "fx-resource-simple-auth",
        ],
      },
    };
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);

    sandbox.stub(mockedCtx.m365TokenProvider as M365TokenProvider, "getJsonObject").resolves(
      ok({
        tid: mockProjectTenantId,
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      })
    );

    aadPlugin.listCollaborator = async function (
      _ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return ok([
        {
          userObjectId: "fake-user-object-id",
          displayName: "fake-display-name",
          userPrincipalName: "fake-user-principal-name",
          resourceId: "fake-aad-resource-id",
        },
      ]);
    };

    appStudioPlugin.listCollaborator = async function (
      _ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return ok([
        {
          userObjectId: "fake-user-object-id",
          displayName: "fake-display-name",
          userPrincipalName: "fake-user-principal-name",
          resourceId: "fake-teams-app-resource-id",
        },
      ]);
    };
    mockedCtx.envInfo.state
      .get(PluginNames.SOLUTION)
      ?.set(REMOTE_TEAMS_APP_TENANT_ID, mockProjectTenantId);

    const result = await solution.listCollaborator(mockedCtx);
    if (result.isErr()) {
      chai.assert.fail("result is error");
    }
    expect(result.value.collaborators!.length).equal(1);
    expect(result.value.collaborators![0].isAadOwner).equal(true);
    expect(result.value.collaborators![0].userObjectId).equal("fake-user-object-id");
    expect(result.value.collaborators![0].userPrincipalName).equal("fake-user-principal-name");
    expect(result.value.collaborators![0].aadResourceId).equal("fake-aad-resource-id");
    expect(result.value.collaborators![0].teamsAppResourceId).equal("fake-teams-app-resource-id");
  });

  it("happy path without aad", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();

    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "SPFx",
        version: "1.0",
        activeResourcePlugins: [
          "fx-resource-spfx",
          "fx-resource-local-debug",
          "fx-resource-appstudio",
        ],
      },
    };
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);

    sandbox.stub(mockedCtx.m365TokenProvider as M365TokenProvider, "getJsonObject").resolves(
      ok({
        tid: mockProjectTenantId,
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      })
    );

    appStudioPlugin.listCollaborator = async function (
      _ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return ok([
        {
          userObjectId: "fake-user-object-id",
          displayName: "fake-display-name",
          userPrincipalName: "fake-user-principal-name",
          resourceId: "fake-teams-app-resource-id",
        },
      ]);
    };
    mockedCtx.envInfo.state
      .get(PluginNames.SOLUTION)
      ?.set(REMOTE_TEAMS_APP_TENANT_ID, mockProjectTenantId);

    const result = await solution.listCollaborator(mockedCtx);
    if (result.isErr()) {
      chai.assert.fail("result is error");
    }
    console.log(result.value.collaborators);
    expect(result.value.collaborators!.length).equal(1);
    expect(result.value.collaborators![0].isAadOwner).equal(false);
    expect(result.value.collaborators![0].userObjectId).equal("fake-user-object-id");
    expect(result.value.collaborators![0].userPrincipalName).equal("fake-user-principal-name");
    expect(result.value.collaborators![0].aadResourceId).equal(undefined);
    expect(result.value.collaborators![0].teamsAppResourceId).equal("fake-teams-app-resource-id");
  });
});
