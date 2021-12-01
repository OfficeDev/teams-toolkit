// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import { SolutionRunningState, TeamsAppSolution } from " ../../../src/plugins/solution";
import {
  ConfigMap,
  SolutionConfig,
  SolutionContext,
  Platform,
  GraphTokenProvider,
  ok,
  Plugin,
  PluginContext,
  Result,
  FxError,
  err,
  returnUserError,
  EnvInfo,
  CryptoProvider,
} from "@microsoft/teamsfx-api";
import {
  GLOBAL_CONFIG,
  PluginNames,
  REMOTE_TEAMS_APP_TENANT_ID,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../../../src/plugins/solution/fx-solution/constants";
import { HostTypeOptionAzure } from "../../../src/plugins/solution/fx-solution/question";
import * as uuid from "uuid";
import sinon from "sinon";
import { EnvConfig, MockGraphTokenProvider } from "../resource/apim/testUtil";
import Container from "typedi";
import { ResourcePlugins } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import { CollaborationState, environmentManager, newEnvInfo } from "../../../src";
import { LocalCrypto } from "../../../src/core/crypto";

chai.use(chaiAsPromised);
const expect = chai.expect;
const appStudioPlugin = Container.get<Plugin>(ResourcePlugins.AppStudioPlugin);
const aadPlugin = Container.get<Plugin>(ResourcePlugins.AadPlugin);

describe("listAllCollaborators() for Teamsfx projects", () => {
  const sandbox = sinon.createSandbox();
  const mockProjectTenantId = "mock_project_tenant_id";

  function mockSolutionContext(): SolutionContext {
    const config: SolutionConfig = new Map();
    config.set(GLOBAL_CONFIG, new ConfigMap());
    const mockGraphTokenProvider = new MockGraphTokenProvider(
      mockProjectTenantId,
      EnvConfig.servicePrincipalClientId,
      EnvConfig.servicePrincipalClientSecret
    );
    return {
      root: ".",
      envInfo: newEnvInfo(),
      answers: { platform: Platform.VSCode },
      projectSettings: undefined,
      graphTokenProvider: mockGraphTokenProvider,
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

    sandbox.stub(mockedCtx.graphTokenProvider as GraphTokenProvider, "getJsonObject").resolves({
      tid: "fake_tid",
      oid: "fake_oid",
      unique_name: "fake_unique_name",
      name: "fake_name",
    });

    sandbox.stub(environmentManager, "listEnvConfigs").resolves(ok([mockedCtx.envInfo.envName]));
    sandbox.stub(environmentManager, "loadEnvInfo").resolves(ok(mockedCtx.envInfo));

    const result = await solution.listAllCollaborators(mockedCtx);

    expect(result.isErr()).to.be.false;
    if (!result.isErr()) {
      expect(result.value[mockedCtx.envInfo.envName].state).equals(
        CollaborationState.NotProvisioned
      );
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
      .stub(mockedCtx.graphTokenProvider as GraphTokenProvider, "getJsonObject")
      .resolves(undefined);

    const result = await solution.listAllCollaborators(mockedCtx);
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

    sandbox.stub(mockedCtx.graphTokenProvider as GraphTokenProvider, "getJsonObject").resolves({
      tid: "fake_tid",
      oid: "fake_oid",
      unique_name: "fake_unique_name",
      name: "fake_name",
    });

    mockedCtx.envInfo.state
      .get(PluginNames.SOLUTION)
      ?.set(REMOTE_TEAMS_APP_TENANT_ID, mockProjectTenantId);
    sandbox.stub(environmentManager, "listEnvConfigs").resolves(ok([mockedCtx.envInfo.envName]));
    sandbox.stub(environmentManager, "loadEnvInfo").resolves(ok(mockedCtx.envInfo));

    const result = await solution.listAllCollaborators(mockedCtx);
    expect(result.isErr()).to.be.false;
    if (!result.isErr()) {
      expect(result.value[mockedCtx.envInfo.envName].state).equals(
        CollaborationState.M365TenantNotMatch
      );
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

    sandbox.stub(mockedCtx.graphTokenProvider as GraphTokenProvider, "getJsonObject").resolves({
      tid: mockProjectTenantId,
      oid: "fake_oid",
      unique_name: "fake_unique_name",
      name: "fake_name",
    });

    sandbox.stub(environmentManager, "listEnvConfigs").resolves(ok([mockedCtx.envInfo.envName]));
    sandbox.stub(environmentManager, "loadEnvInfo").resolves(ok(mockedCtx.envInfo));

    appStudioPlugin.listCollaborator = async function (
      _ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return err(
        returnUserError(
          new Error(`List collaborator failed.`),
          "AppStudioPlugin",
          SolutionError.FailedToListCollaborator
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

    const result = await solution.listAllCollaborators(mockedCtx);
    expect(result.isErr()).to.be.false;
    if (!result.isErr()) {
      expect(result.value[mockedCtx.envInfo.envName].state).equal(CollaborationState.ERROR);
      expect(result.value[mockedCtx.envInfo.envName].error.error.name).equals(
        SolutionError.FailedToListCollaborator
      );
    }
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
      },
    };
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);

    sandbox.stub(environmentManager, "listEnvConfigs").resolves(ok([mockedCtx.envInfo.envName]));
    sandbox.stub(environmentManager, "loadEnvInfo").resolves(ok(mockedCtx.envInfo));

    sandbox.stub(mockedCtx.graphTokenProvider as GraphTokenProvider, "getJsonObject").resolves({
      tid: mockProjectTenantId,
      oid: "fake_oid",
      unique_name: "fake_unique_name",
      name: "fake_name",
    });

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

    const result = await solution.listAllCollaborators(mockedCtx);
    if (result.isErr()) {
      chai.assert.fail("result is error");
    }
    expect(result.value[mockedCtx.envInfo.envName].collaborators!.length).equal(1);
    expect(result.value[mockedCtx.envInfo.envName].collaborators![0].isAadOwner).equal(true);
    expect(result.value[mockedCtx.envInfo.envName].collaborators![0].userObjectId).equal(
      "fake-user-object-id"
    );
    expect(result.value[mockedCtx.envInfo.envName].collaborators![0].userPrincipalName).equal(
      "fake-user-principal-name"
    );
    expect(result.value[mockedCtx.envInfo.envName].collaborators![0].aadResourceId).equal(
      "fake-aad-resource-id"
    );
    expect(result.value[mockedCtx.envInfo.envName].collaborators![0].teamsAppResourceId).equal(
      "fake-teams-app-resource-id"
    );
  });
});
