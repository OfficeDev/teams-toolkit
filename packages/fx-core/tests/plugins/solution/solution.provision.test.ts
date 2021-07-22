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
  Dialog,
  DialogMsg,
  IProgressHandler,
  Platform,
  UserInteraction,
  SingleSelectConfig,
  SingleSelectResult,
  MultiSelectConfig,
  MultiSelectResult,
  InputTextConfig,
  InputTextResult,
  SelectFileConfig,
  SelectFileResult,
  SelectFilesResult,
  SelectFilesConfig,
  SelectFolderResult,
  SelectFolderConfig,
  Colors,
  RunnableTask,
  TaskConfig,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import fs, { PathLike } from "fs-extra";
import {
  DEFAULT_PERMISSION_REQUEST,
  GLOBAL_CONFIG,
  REMOTE_AAD_ID,
  REMOTE_TEAMS_APP_ID,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
  WEB_APPLICATION_INFO_SOURCE,
} from "../../../src/plugins/solution/fx-solution/constants";
import {
  FRONTEND_DOMAIN,
  FRONTEND_ENDPOINT,
  REMOTE_MANIFEST,
} from "../../../src/plugins/resource/appstudio/constants";
import {
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
} from "../../../src/plugins/solution/fx-solution/question";
import { validManifest } from "./util";
import { IAppDefinition } from "../../../src/plugins/resource/appstudio/interfaces/IAppDefinition";
import _ from "lodash";
import { TokenCredential } from "@azure/core-auth";
import { TokenCredentialsBase, UserTokenCredentials } from "@azure/ms-rest-nodeauth";
import { ResourceGroups } from "@azure/arm-resources";
import { AppStudioClient } from "../../../src/plugins/resource/appstudio/appStudio";
import { AppStudioPluginImpl } from "../../../src/plugins/resource/appstudio/plugin";
import * as solutionUtil from "../../../src/plugins/solution/fx-solution/util";
import * as uuid from "uuid";
import { ResourcePlugins } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import { AadAppForTeamsPlugin } from "../../../src";
import Container from "typedi";

chai.use(chaiAsPromised);
const expect = chai.expect;
const aadPlugin = Container.get<Plugin>(ResourcePlugins.AadPlugin) as AadAppForTeamsPlugin;
const spfxPlugin = Container.get<Plugin>(ResourcePlugins.SpfxPlugin);
const fehostPlugin = Container.get<Plugin>(ResourcePlugins.FrontendPlugin);
const appStudioPlugin = Container.get<Plugin>(ResourcePlugins.AppStudioPlugin);
class MockUserInteraction implements UserInteraction {
  selectOption(config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  selectOptions(config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  selectFolder(config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> {
    throw new Error("Method not implemented.");
  }

  openUrl(link: string): Promise<Result<boolean, FxError>> {
    throw new Error("Method not implemented.");
  }
  async showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  async showMessage(
    level: "info" | "warn" | "error",
    message: Array<{ content: string; color: Colors }>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  async showMessage(
    level: "info" | "warn" | "error",
    message: string | Array<{ content: string; color: Colors }>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>> {
    if (modal === true && _.isEqual(["Provision", "Pricing calculator"], items)) {
      return ok("Provision");
    }
    throw new Error("Method not implemented.");
  }
  createProgressBar(title: string, totalSteps: number): IProgressHandler {
    throw new Error("Method not implemented.");
  }
  runWithProgress<T>(
    task: RunnableTask<T>,
    config: TaskConfig,
    ...args: any
  ): Promise<Result<T, FxError>> {
    throw new Error("Method not implemented.");
  }
}
class MockedDialog implements Dialog {
  async communicate(msg: DialogMsg): Promise<DialogMsg> {
    throw new Error("Method not implemented.");
  }

  createProgressBar(_title: string, _totalSteps: number): IProgressHandler {
    throw new Error("Method not implemented.");
  }
}

class MockedAppStudioTokenProvider implements AppStudioTokenProvider {
  async getAccessToken(showDialog?: boolean): Promise<string> {
    return "someFakeToken";
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {
      tid: "222",
    };
  }
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeCallback(
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
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
  async getAccountCredentialAsync(
    showDialog?: boolean,
    tenantId?: string
  ): Promise<TokenCredentialsBase> {
    return new UserTokenCredentials("someClientId", "some.domain", "someUserName", "somePassword");
  }
  getIdentityCredentialAsync(showDialog?: boolean): Promise<TokenCredential> {
    throw new Error("Method not implemented.");
  }
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeCallback(
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {
      tid: "222",
    };
  }
  async listSubscriptions(): Promise<SubscriptionInfo[]> {
    return [
      {
        subscriptionName: mockedSubscriptionName,
        subscriptionId: mockedSubscriptionId,
        tenantId: mockedTenantId,
      },
    ];
  }
  async setSubscription(subscriptionId: string): Promise<void> {
    return;
  }
  getAccountInfo(): Record<string, string> | undefined {
    return {};
  }
  getSelectedSubscription(): Promise<SubscriptionInfo | undefined> {
    const selectedSub = {
      subscriptionId: "subscriptionId",
      tenantId: "tenantId",
      subscriptionName: "subscriptionName",
    };
    return Promise.resolve(selectedSub);
  }
}

function mockSolutionContext(): SolutionContext {
  const config: SolutionConfig = new Map();
  config.set(GLOBAL_CONFIG, new ConfigMap());
  return {
    root: ".",
    // app: new TeamsAppManifest(),
    config,
    dialog: new MockedDialog(),
    ui: new MockUserInteraction(),
    answers: { platform: Platform.VSCode },
    projectSettings: undefined,
    appStudioToken: new MockedAppStudioTokenProvider(),
    azureAccountProvider: new MockedAzureTokenProvider(),
  };
}

function mockProvisionThatAlwaysSucceed(plugin: Plugin) {
  plugin.preProvision = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  };
  plugin.provision = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  };
  plugin.postProvision = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  };
}

describe("provision() simple cases", () => {
  const mocker = sinon.createSandbox();

  const mockedManifest = _.cloneDeep(validManifest);
  // ignore icons for simplicity
  mockedManifest.icons.color = "";
  mockedManifest.icons.outline = "";

  const mockedAppDef: IAppDefinition = {
    appName: "MyApp",
    teamsAppId: "qwertasdf",
  };

  afterEach(() => {
    mocker.restore();
  });
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

  it("should return error if manifest file is not found", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [fehostPlugin.name],
      },
    };
    // We leverage the fact that in testing env, this is not file at `${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`
    // So we even don't need to mock fs.readJson
    const result = await solution.provision(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals("ManifestLoadFailed");
  });

  it("should return false even if provisionSucceeded is true", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
    const result = await solution.provision(mockedCtx);
    expect(result.isOk()).to.be.false;
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
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [fehostPlugin.name],
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
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [spfxPlugin.name],
      },
    };
    solution.doProvision = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
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
    teamsAppId: "qwertasdf",
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
    mocker
      .stub<any, any>(fs, "readJson")
      .withArgs(`./.${ConfigFolderName}/${REMOTE_MANIFEST}`)
      .resolves(mockedManifest);
    // mocker.stub<any, any>(fs, "pathExists").withArgs(permissionsJsonPath).resolves(true);
    mocker.stub(AppStudioClient, "createApp").resolves(mockedAppDef);
    mocker.stub(AppStudioClient, "updateApp").resolves(mockedAppDef);
  });

  afterEach(() => {
    mocker.restore();
  });

  it("should succeed if app studio returns successfully", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [spfxPlugin.name, appStudioPlugin.name],
      },
    };

    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be.undefined;
    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(REMOTE_TEAMS_APP_ID)).to.be.undefined;
    const result = await solution.provision(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be.true;
    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(REMOTE_TEAMS_APP_ID)).equals(
      mockedAppDef.teamsAppId
    );
    expect(solution.runningState).equals(SolutionRunningState.Idle);
  });
});

describe("provision() happy path for Azure projects", () => {
  const mocker = sinon.createSandbox();
  const permissionsJsonPath = "./permissions.json";
  const resourceGroupName = "test-rg";

  const mockedAppDef: IAppDefinition = {
    appName: "MyApp",
    teamsAppId: "qwertasdf",
  };
  const mockedManifest = _.cloneDeep(validManifest);
  // ignore icons for simplicity
  mockedManifest.icons.color = "";
  mockedManifest.icons.outline = "";
  beforeEach(() => {
    mocker.stub<any, any>(fs, "pathExists").withArgs(permissionsJsonPath).resolves(true);
    mocker
      .stub<any, any>(fs, "readJSON")
      .withArgs(permissionsJsonPath)
      .resolves(DEFAULT_PERMISSION_REQUEST);
    mocker
      .stub<any, any>(fs, "readJson")
      .withArgs(`./.${ConfigFolderName}/${REMOTE_MANIFEST}`)
      .resolves(mockedManifest);
    mocker.stub(AppStudioClient, "createApp").resolves(mockedAppDef);
    mocker.stub(AppStudioClient, "updateApp").resolves(mockedAppDef);
    // mocker.stub(ResourceGroups.prototype, "checkExistence").resolves({body: true});
    mocker.stub(ResourceGroups.prototype, "createOrUpdate").resolves({ name: resourceGroupName });
    mocker.stub(solutionUtil, "getSubsriptionDisplayName").resolves(mockedSubscriptionName);
  });

  afterEach(() => {
    mocker.restore();
  });

  it("should succeed if app studio returns successfully", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [fehostPlugin.name, aadPlugin.name, appStudioPlugin.name],
      },
    };

    mockProvisionThatAlwaysSucceed(fehostPlugin);
    fehostPlugin.provision = async function (ctx: PluginContext): Promise<Result<any, FxError>> {
      ctx.config.set(FRONTEND_ENDPOINT, "http://example.com");
      ctx.config.set(FRONTEND_DOMAIN, "http://example.com");
      return ok(Void);
    };

    mockProvisionThatAlwaysSucceed(aadPlugin);
    aadPlugin.postProvision = async function (ctx: PluginContext): Promise<Result<any, FxError>> {
      ctx.config.set(REMOTE_AAD_ID, "mockedRemoteAadId");
      return ok(Void);
    };

    aadPlugin.setApplicationInContext = function (
      ctx: PluginContext,
      _isLocalDebug?: boolean
    ): Result<any, FxError> {
      ctx.config.set(WEB_APPLICATION_INFO_SOURCE, "mockedWebApplicationInfoResouce");
      return ok(Void);
    };
    const spy = mocker.spy(aadPlugin, "setApplicationInContext");

    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be.undefined;
    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(REMOTE_TEAMS_APP_ID)).to.be.undefined;
    // mockedCtx.config.get(GLOBAL_CONFIG)?.set("resourceGroupName", resourceGroupName);
    mockedCtx.config.get(GLOBAL_CONFIG)?.set("subscriptionId", mockedSubscriptionId);
    mockedCtx.config.get(GLOBAL_CONFIG)?.set("tenantId", mockedTenantId);
    mocker.stub(AppStudioPluginImpl.prototype, "getConfigForCreatingManifest" as any).returns(
      ok({
        tabEndpoint: "tabEndpoint",
        tabDomain: "tabDomain",
        aadId: uuid.v4(),
        botDomain: "botDomain",
        botId: uuid.v4(),
        webApplicationInfoResource: "webApplicationInfoResource",
      })
    );
    const result = await solution.provision(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(spy.calledOnce).to.be.true;
    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be.true;
    expect(mockedCtx.config.get(GLOBAL_CONFIG)?.get(REMOTE_TEAMS_APP_ID)).equals(
      mockedAppDef.teamsAppId
    );
  });
});
