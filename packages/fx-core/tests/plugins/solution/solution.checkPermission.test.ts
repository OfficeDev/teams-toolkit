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
import { CollaborationState, newEnvInfo } from "../../../src";
import { LocalCrypto } from "../../../src/core/crypto";

chai.use(chaiAsPromised);
const expect = chai.expect;
const appStudioPlugin = Container.get<Plugin>(ResourcePlugins.AppStudioPlugin);
const aadPlugin = Container.get<Plugin>(ResourcePlugins.AadPlugin);

describe("checkPermission() for Teamsfx projects", () => {
  const sandbox = sinon.createSandbox();
  const mockProjectTenantId = "mock_project_tenant_id";

  function mockSolutionContext(): SolutionContext {
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

    const result = await solution.checkPermission(mockedCtx);
    expect(result.isErr()).to.be.false;
    if (!result.isErr()) {
      expect(result.value.state).equals(CollaborationState.NotProvisioned);
    }

    sandbox.restore();
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

    const result = await solution.checkPermission(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.FailedToRetrieveUserInfo);
    sandbox.restore();
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

    mockedCtx.envInfo.state.set(PluginNames.AAD, new ConfigMap());
    mockedCtx.envInfo.state.get(PluginNames.AAD)?.set(REMOTE_TENANT_ID, mockProjectTenantId);

    const result = await solution.checkPermission(mockedCtx);
    expect(result.isErr()).to.be.false;
    if (!result.isErr()) {
      expect(result.value.state).equals(CollaborationState.M365TenantNotMatch);
    }
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
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);

    sandbox.stub(mockedCtx.graphTokenProvider as GraphTokenProvider, "getJsonObject").resolves({
      tid: mockProjectTenantId,
      oid: "fake_oid",
      unique_name: "fake_unique_name",
      name: "fake_name",
    });

    appStudioPlugin.checkPermission = async function (
      _ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return err(
        returnUserError(
          new Error(`Check permission failed.`),
          "AppStudioPlugin",
          "FailedToCheckPermission"
        )
      );
    };

    aadPlugin.checkPermission = async function (
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

    mockedCtx.envInfo.state.set(PluginNames.AAD, new ConfigMap());
    mockedCtx.envInfo.state.get(PluginNames.AAD)?.set(REMOTE_TENANT_ID, mockProjectTenantId);

    const result = await solution.checkPermission(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals("FailedToCheckPermission");
    sinon.restore();
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

    sandbox.stub(mockedCtx.graphTokenProvider as GraphTokenProvider, "getJsonObject").resolves({
      tid: mockProjectTenantId,
      oid: "fake_oid",
      unique_name: "fake_unique_name",
      name: "fake_name",
    });

    aadPlugin.checkPermission = async function (
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

    appStudioPlugin.checkPermission = async function (
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
    mockedCtx.envInfo.state.set(PluginNames.AAD, new ConfigMap());
    mockedCtx.envInfo.state.get(PluginNames.AAD)?.set(REMOTE_TENANT_ID, mockProjectTenantId);

    const result = await solution.checkPermission(mockedCtx);
    if (result.isErr()) {
      chai.assert.fail("result is error");
    }
    expect(result.value.permissions!.length).equal(2);
    sinon.restore();
  });
});
