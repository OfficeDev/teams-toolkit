// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import { SolutionRunningState, TeamsAppSolution } from " ../../../src/plugins/solution";
import {
  AppStudioTokenProvider,
  ConfigFolderName,
  ConfigMap,
  FxError,
  ok,
  PluginContext,
  Result,
  SolutionConfig,
  SolutionContext,
  TeamsAppManifest,
  Void,
  Plugin,
  AzureAccountProvider,
  SubscriptionInfo,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import fs, { PathLike } from "fs-extra";
import {
  DEFAULT_PERMISSION_REQUEST,
  GLOBAL_CONFIG,
  REMOTE_MANIFEST,
  REMOTE_TEAMS_APP_ID,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../../../src/plugins/solution/fx-solution/constants";
import {
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
} from "../../../src/plugins/solution/fx-solution/question";
import { validManifest } from "./util";
import { AppStudio } from "../../../src/plugins/solution/fx-solution/appstudio/appstudio";
import {
  IAppDefinition,
} from "../../../src/plugins/solution/fx-solution/appstudio/interface";
import _ from "lodash";
import { AadAppForTeamsPlugin } from "../../../src/plugins/resource/aad";
import { TokenCredential } from "@azure/core-auth";
import { TokenCredentialsBase, UserTokenCredentials } from "@azure/ms-rest-nodeauth";
import { ResourceGroups, ResourceManagementClient } from "@azure/arm-resources";


chai.use(chaiAsPromised);
const expect = chai.expect;

class MockedAppStudioTokenProvider implements AppStudioTokenProvider {
  async getAccessToken(showDialog?: boolean): Promise<string> {
    return "someFakeToken";
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {
      tid: "222"
    };
  }
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeCallback(statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeMap(name: string, statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>, immediateCall?: boolean): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}

const mockedSubscriptionName = "subname";
const mockedSubscriptionId = "111";
const mockedTenantId = "222";

class MockedAzureTokenProvider implements AzureAccountProvider {
  getAccountCredential(showDialog?: boolean): TokenCredentialsBase {
    throw new Error("Method not implemented.");
  }
  getIdentityCredential(showDialog?: boolean): TokenCredential {
    throw new Error("Method not implemented.");
  }
  async getAccountCredentialAsync(showDialog?: boolean, tenantId?: string): Promise<TokenCredentialsBase> {
    return new UserTokenCredentials("someClientId", "some.domain", "someUserName", "somePassword");
  }
  getIdentityCredentialAsync(showDialog?: boolean): Promise<TokenCredential> {
    throw new Error("Method not implemented.");
  }
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeCallback(statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeMap(name: string, statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>, immediateCall?: boolean): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {
      tid: "222"
    };
  }
  async listSubscriptions(): Promise<SubscriptionInfo[]> {
    return [{ subscriptionName: mockedSubscriptionName, subscriptionId: mockedSubscriptionId, tenantId: mockedTenantId}];
  }
  async setSubscription(subscriptionId: string): Promise<void> {
    return;
  }

}


function mockSolutionContext(): SolutionContext {
  const config: SolutionConfig = new Map();
  config.set(GLOBAL_CONFIG, new ConfigMap);
  return {
    root: ".",
    app: new TeamsAppManifest(),
    config,
    answers: new ConfigMap(),
    projectSettings: undefined,
    appStudioToken: new MockedAppStudioTokenProvider,
    azureAccountProvider: new MockedAzureTokenProvider,
  };
}

function mockProvisionThatAlwaysSucceed(plugin: Plugin) {
  plugin.preProvision = async function (
    _ctx: PluginContext,
  ): Promise<Result<any, FxError>> {
    return ok(Void);
  };
  plugin.provision = async function (
    _ctx: PluginContext,
  ): Promise<Result<any, FxError>> {
    return ok(Void);
  };
  plugin.postProvision = async function (
    _ctx: PluginContext,
  ): Promise<Result<any, FxError>> {
    return ok(Void);
  };
}



describe("provision() simple cases", () => {
  it("should return error if solution state is not idle", async () => {
    const solution = new TeamsAppSolution();
    expect(solution.runningState).equal(SolutionRunningState.Idle);

    const mockedCtx = mockSolutionContext();
    solution.runningState = SolutionRunningState.ProvisionInProgress;
    let result = await solution.provision(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.ProvisionInProgress);

    solution.runningState = SolutionRunningState.DeployInProgress;
    result = await solution.provision(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.DeploymentInProgress);

    solution.runningState = SolutionRunningState.PublishInProgress;
    result = await solution.provision(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.PublishInProgress);
  });

  it("should return error for invalid plugin names", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    const someInvalidPluginName = "SomeInvalidPluginName";
    mockedCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [someInvalidPluginName]
      },
    };
    const result = await solution.provision(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals("ProvisionFailure");
    expect(result._unsafeUnwrapErr().message).contains(`Plugin name ${someInvalidPluginName} is not valid`);
  });

  it("should return error if manifest file is not found", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [solution.fehostPlugin.name]
      },
    };
    // We leverage the fact that in testing env, this is not file at `${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}` 
    // So we even don't need to mock fs.readJson
    const result = await solution.provision(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.FailedToLoadManifestFile);
  });

  it("should return ok if provisionSucceeded is true", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
    const result = await solution.provision(mockedCtx);
    expect(result.isOk()).to.be.true;
  });

});

describe("provision() with permission.json file missing", () => {
  const mocker = sinon.createSandbox();
  const permissionsJsonPath = "./permissions.json";

  const fileContent: Map<string, any> = new Map();
  beforeEach(() => {
    mocker.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
      fileContent.set(path.toString(), data);
    });
    mocker.stub(fs, "writeJSON").callsFake((file: string, obj: any) => {
      fileContent.set(file, JSON.stringify(obj));
    });
    mocker.stub<any, any>(fs, "pathExists").withArgs(permissionsJsonPath).resolves(false);
  });

  afterEach(() => {
    mocker.restore();
  });

  it("should return error for Azure projects", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [solution.fehostPlugin.name]
      },
    };
    const result = await solution.provision(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.MissingPermissionsJson);
  });

  it("should work for SPFx projects on happy path", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [solution.spfxPlugin.name]
      },
    };
    solution.doProvision = async function (
      _ctx: PluginContext,
    ): Promise<Result<any, FxError>> {
      return ok(Void);
    };

    const result = await solution.provision(mockedCtx);
    expect(result.isOk()).to.be.true;
  });

});

describe("provision() happy path for SPFx projects", () => {
  const mocker = sinon.createSandbox();
  // const permissionsJsonPath = "./permissions.json";

  const fileContent: Map<string, any> = new Map();
  const mockedAppDef: IAppDefinition = {
    appName: "MyApp",
    teamsAppId: "qwertasdf"
  };
  const mockedManifest = _.cloneDeep(validManifest);
  // ignore icons for simplicity
  mockedManifest.icons.color = "";
  mockedManifest.icons.outline = "";
  beforeEach(() => {
    mocker.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
      fileContent.set(path.toString(), data);
    });
    mocker.stub(fs, "writeJSON").callsFake((file: string, obj: any) => {
      fileContent.set(file, JSON.stringify(obj));
    });
    mocker.stub<any, any>(fs, "readJson").withArgs(`./.${ConfigFolderName}/${REMOTE_MANIFEST}`).resolves(mockedManifest);
    // mocker.stub<any, any>(fs, "pathExists").withArgs(permissionsJsonPath).resolves(true);
    mocker.stub(AppStudio, "createApp").resolves(mockedAppDef);
    mocker.stub(AppStudio, "updateApp").resolves(mockedAppDef);

  });

  afterEach(() => {
    mocker.restore();
  });

  it("should succeed if app studio returns successfully", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [solution.spfxPlugin.name]
      },
    };

    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be.undefined;
    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(REMOTE_TEAMS_APP_ID)).to.be.undefined;
    const result = await solution.provision(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be.true;
    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(REMOTE_TEAMS_APP_ID)).equals(mockedAppDef.teamsAppId);
    expect(solution.runningState).equals(SolutionRunningState.Idle);
  });
});

describe("provision() happy path for Azure projects", () => {
  const mocker = sinon.createSandbox();
  const permissionsJsonPath = "./permissions.json";

  const mockedAppDef: IAppDefinition = {
    appName: "MyApp",
    teamsAppId: "qwertasdf"
  };
  const mockedManifest = _.cloneDeep(validManifest);
  // ignore icons for simplicity
  mockedManifest.icons.color = "";
  mockedManifest.icons.outline = "";
  beforeEach(() => {
    mocker.stub<any, any>(fs, "pathExists").withArgs(permissionsJsonPath).resolves(true);
    mocker.stub<any, any>(fs, "readJSON").withArgs(permissionsJsonPath).resolves(DEFAULT_PERMISSION_REQUEST);
    mocker.stub<any, any>(fs, "readJson").withArgs(`./.${ConfigFolderName}/${REMOTE_MANIFEST}`).resolves(mockedManifest);
    mocker.stub(AppStudio, "createApp").resolves(mockedAppDef);
    mocker.stub(AppStudio, "updateApp").resolves(mockedAppDef);
    // mocker.stub(ResourceGroups.prototype, "checkExistence").resolves({body: true});
    mocker.stub(ResourceGroups.prototype, "createOrUpdate").resolves({name: "ut-rg"});
  });

  afterEach(() => {
    mocker.restore();
  });

  it("should succeed if app studio returns successfully", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [solution.fehostPlugin.name, solution.aadPlugin.name]
      },
    };

    mockProvisionThatAlwaysSucceed(solution.fehostPlugin);
    mockProvisionThatAlwaysSucceed(solution.aadPlugin);
    const aadPlugin: AadAppForTeamsPlugin = solution.aadPlugin as any;
    aadPlugin.setApplicationInContext = function (
      _ctx: PluginContext, _isLocalDebug?: boolean
    ): Result<any, FxError> {
      return ok(Void);
    };

    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be.undefined;
    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(REMOTE_TEAMS_APP_ID)).to.be.undefined;
    mockedCtx.config.get(GLOBAL_CONFIG)?.set("subscriptionId", mockedSubscriptionId);
    mockedCtx.config.get(GLOBAL_CONFIG)?.set("tenantId", mockedTenantId);
    const result = await solution.provision(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be.true;
    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(REMOTE_TEAMS_APP_ID)).equals(mockedAppDef.teamsAppId);
  });
});