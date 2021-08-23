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
  Void,
  err,
  returnUserError,
} from "@microsoft/teamsfx-api";
import {
  GLOBAL_CONFIG,
  PluginNames,
  REMOTE_TENANT_ID,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../../../src/plugins/solution/fx-solution/constants";
import { HostTypeOptionAzure } from "../../../src/plugins/solution/fx-solution/question";
import * as uuid from "uuid";
import sinon from "sinon";
import { EnvConfig, MockGraphTokenProvider } from "../resource/apim/testUtil";
import Container from "typedi";
import { ResourcePlugins } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";

chai.use(chaiAsPromised);
const expect = chai.expect;
const appStudioPlugin = Container.get<Plugin>(ResourcePlugins.AppStudioPlugin);
const aadPlugin = Container.get<Plugin>(ResourcePlugins.AadPlugin);

describe("grantPermission() for Teamsfx projects", () => {
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
      config,
      answers: { platform: Platform.VSCode },
      projectSettings: undefined,
      graphTokenProvider: mockGraphTokenProvider,
    };
  }

  it("should return error if solution state is not idle", async () => {
    const solution = new TeamsAppSolution();
    expect(solution.runningState).equal(SolutionRunningState.Idle);

    const mockedCtx = mockSolutionContext();
    solution.runningState = SolutionRunningState.ProvisionInProgress;
    let result = await solution.grantPermission(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.ProvisionInProgress);

    solution.runningState = SolutionRunningState.DeployInProgress;
    result = await solution.grantPermission(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.DeploymentInProgress);

    solution.runningState = SolutionRunningState.PublishInProgress;
    result = await solution.grantPermission(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.PublishInProgress);
  });

  it("should return error if Teamsfx project hasn't been provisioned", async () => {
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
    const result = await solution.grantPermission(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.CannotProcessBeforeProvision);
  });

  it("should return error if cannot get current user info", async () => {
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
    mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);

    sandbox
      .stub(mockedCtx.graphTokenProvider as GraphTokenProvider, "getJsonObject")
      .resolves(undefined);

    const result = await solution.grantPermission(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.FailedToRetrieveUserInfo);
    sandbox.restore();
  });

  it("should return error if tenant is not match", async () => {
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
    mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);

    sandbox.stub(mockedCtx.graphTokenProvider as GraphTokenProvider, "getJsonObject").resolves({
      tid: "fake_tid",
      oid: "fake_oid",
      unique_name: "fake_unique_name",
      name: "fake_name",
    });

    mockedCtx.config.set(PluginNames.AAD, new ConfigMap());
    mockedCtx.config.get(PluginNames.AAD)?.set(REMOTE_TENANT_ID, mockProjectTenantId);

    const result = await solution.grantPermission(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.M365AccountNotMatch);
    sandbox.restore();
  });

  it("should return error if cannot find user from email", async () => {
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
    mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);

    sandbox
      .stub(mockedCtx.graphTokenProvider as GraphTokenProvider, "getJsonObject")
      .onCall(0)
      .resolves({
        tid: mockProjectTenantId,
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      })
      .onCall(1)
      .resolves(undefined);

    mockedCtx.config.set(PluginNames.AAD, new ConfigMap());
    mockedCtx.config.get(PluginNames.AAD)?.set(REMOTE_TENANT_ID, mockProjectTenantId);

    const result = await solution.grantPermission(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.CannotFindUserInCurrentTenant);
    sandbox.restore();
  });

  it("should return error if check permission failed", async () => {
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
    mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);

    sandbox
      .stub(mockedCtx.graphTokenProvider as GraphTokenProvider, "getJsonObject")
      .onCall(0)
      .resolves({
        tid: mockProjectTenantId,
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      })
      .onCall(1)
      .resolves({
        tid: mockProjectTenantId,
        oid: "fake_oid_2",
        unique_name: "fake_unique_name_2",
        name: "fake_name_2",
      });

    appStudioPlugin.grantPermission = async function (
      _ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return err(
        returnUserError(
          new Error(`Grant permission failed.`),
          "AppStudioPlugin",
          SolutionError.FailedToGrantPermission
        )
      );
    };

    aadPlugin.grantPermission = async function (
      _ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return ok([
        {
          name: "aad_app",
          resourceId: "fake_aad_app_resource_id",
          roles: "Owner",
          type: "M365",
        },
      ]);
    };

    mockedCtx.config.set(PluginNames.AAD, new ConfigMap());
    mockedCtx.config.get(PluginNames.AAD)?.set(REMOTE_TENANT_ID, mockProjectTenantId);

    const result = await solution.grantPermission(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.FailedToGrantPermission);

    sandbox.restore();
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
    mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);

    sandbox
      .stub(mockedCtx.graphTokenProvider as GraphTokenProvider, "getJsonObject")
      .onCall(0)
      .resolves({
        tid: mockProjectTenantId,
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      })
      .onCall(1)
      .resolves({
        tid: mockProjectTenantId,
        oid: "fake_oid_2",
        unique_name: "fake_unique_name_2",
        name: "fake_name_2",
      });

    appStudioPlugin.grantPermission = async function (
      _ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return ok([
        {
          name: "aad_app",
          resourceId: "fake_aad_app_resource_id",
          roles: "Owner",
          type: "M365",
        },
      ]);
    };

    aadPlugin.grantPermission = async function (
      _ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return ok([
        {
          name: "teams_app",
          resourceId: "fake_teams_app_resource_id",
          roles: "Administrator",
          type: "M365",
        },
      ]);
    };
    mockedCtx.config.set(PluginNames.AAD, new ConfigMap());
    mockedCtx.config.get(PluginNames.AAD)?.set(REMOTE_TENANT_ID, mockProjectTenantId);

    const result = await solution.grantPermission(mockedCtx);
    if (result.isErr()) {
      chai.assert.fail("result is error");
    }
    expect(result.value.length).equal(2);

    sinon.restore();
  });
});
