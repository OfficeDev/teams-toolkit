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
  Void,
  Plugin,
  AzureAccountProvider,
  SubscriptionInfo,
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
  TeamsAppManifest,
  UserError,
  ProjectSettings,
  Inputs,
  TokenProvider,
  v2,
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
import {
  MockedGraphTokenProvider,
  MockedSharepointProvider,
  MockedUserInteraction,
  MockedV2Context,
  validManifest,
} from "./util";
import { IAppDefinition } from "../../../src/plugins/resource/appstudio/interfaces/IAppDefinition";
import _ from "lodash";
import { TokenCredential } from "@azure/core-auth";
import { TokenCredentialsBase, UserTokenCredentials } from "@azure/ms-rest-nodeauth";
import { Providers, ResourceGroups, ResourceManagementClient } from "@azure/arm-resources";
import { AppStudioClient } from "../../../src/plugins/resource/appstudio/appStudio";
import { AppStudioPluginImpl } from "../../../src/plugins/resource/appstudio/plugin";
import * as solutionUtil from "../../../src/plugins/solution/fx-solution/utils/util";
import * as uuid from "uuid";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import { AadAppForTeamsPlugin } from "../../../src/plugins/resource/aad";
import { newEnvInfo } from "../../../src/core/tools";
import { isArmSupportEnabled } from "../../../src/common/tools";
import Container from "typedi";
import { askResourceGroupInfo } from "../../../src/plugins/solution/fx-solution/commonQuestions";
import { ResourceManagementModels } from "@azure/arm-resources";
import { CoreQuestionNames } from "../../../src/core/question";
import { Subscriptions } from "@azure/arm-subscriptions";
import { SubscriptionsListLocationsResponse } from "@azure/arm-subscriptions/esm/models";
import * as msRest from "@azure/ms-rest-js";
import { ProvidersGetOptionalParams, ProvidersGetResponse } from "@azure/arm-resources/esm/models";
import { SolutionPluginsV2 } from "../../../src/core/SolutionPluginContainer";
import { TeamsAppSolutionV2 } from "../../../src/plugins/solution/fx-solution/v2/solution";
import { EnvInfoV2, ResourceProvisionOutput } from "@microsoft/teamsfx-api/build/v2";
import frontend from "../../../src/plugins/resource/frontend";
import { UnknownObject } from "@azure/core-http/types/latest/src/util/utils";
import { LocalCrypto } from "../../../src/core/crypto";
import * as arm from "../../../src/plugins/solution/fx-solution/arm";
import * as armResources from "@azure/arm-resources";

chai.use(chaiAsPromised);
const expect = chai.expect;
const aadPlugin = Container.get<Plugin>(ResourcePlugins.AadPlugin) as AadAppForTeamsPlugin;
const spfxPlugin = Container.get<Plugin>(ResourcePlugins.SpfxPlugin);
const fehostPlugin = Container.get<Plugin>(ResourcePlugins.FrontendPlugin);
const appStudioPlugin = Container.get<Plugin>(ResourcePlugins.AppStudioPlugin);

const aadPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AadPlugin);
const spfxPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.SpfxPlugin);
const fehostPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.FrontendPlugin);
const appStudioPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);

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

const mockedSubscriptionName = "mocked subscription id";
const mockedSubscriptionId = "mocked subscription id";
const mockedTenantId = "mocked tenant id";

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
  return {
    root: ".",
    envInfo: newEnvInfo(),
    ui: new MockUserInteraction(),
    answers: { platform: Platform.VSCode },
    projectSettings: undefined,
    appStudioToken: new MockedAppStudioTokenProvider(),
    azureAccountProvider: new MockedAzureTokenProvider(),
    cryptoProvider: new LocalCrypto(""),
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

function mockProvisionV2ThatAlwaysSucceed(plugin: v2.ResourcePlugin) {
  plugin.provisionResource = async function (): Promise<Result<ResourceProvisionOutput, FxError>> {
    return ok({ output: {}, secrets: {} });
  };

  plugin.configureResource = async function (): Promise<Result<ResourceProvisionOutput, FxError>> {
    return ok({ output: {}, secrets: {} });
  };
}

function mockCtxWithResourceGroupQuestions(createNew: boolean, name: string, newLocation = "") {
  const mockedCtx = mockSolutionContext();
  mockedCtx.ui!.selectOption = async (
    config: SingleSelectConfig
  ): Promise<Result<SingleSelectResult, FxError>> => {
    if (config.name === CoreQuestionNames.TargetResourceGroupName) {
      return ok({ type: "success", result: createNew ? "+ New resource group" : name });
    } else if (config.name === CoreQuestionNames.NewResourceGroupLocation) {
      return ok({ type: "success", result: newLocation });
    } else {
      throw new Error("not implemented");
    }
  };
  mockedCtx.ui!.inputText = async (
    config: InputTextConfig
  ): Promise<Result<InputTextResult, FxError>> => {
    if (config.name === CoreQuestionNames.NewResourceGroupName) {
      return ok({ type: "success", result: name });
    } else {
      throw new Error("not implemented");
    }
  };
  mockedCtx.ui!.createProgressBar = (title: string, totalSteps: number): IProgressHandler => {
    return {
      start: async (detail?: string) => {
        return;
      },
      end: async (success: boolean) => {
        return;
      },
      next: async (detail?: string) => {
        return;
      },
    };
  };
  return mockedCtx;
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
  });

  it("should return false even if provisionSucceeded is true", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
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
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [spfxPlugin.name],
      },
    };
    solution.doProvision = async function (_ctx: SolutionContext): Promise<Result<any, FxError>> {
      return ok(Void);
    };

    const result = await solution.provision(mockedCtx);
    expect(result.isOk()).to.be.true;
  });
});

describe("provision() happy path for SPFx projects", () => {
  const mocker = sinon.createSandbox();
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
    mocker.stub(AppStudioClient, "createApp").resolves(mockedAppDef);
    mocker.stub(AppStudioClient, "updateApp").resolves(mockedAppDef);
    mocker
      .stub(AppStudioPluginImpl.prototype, "reloadManifestAndCheckRequiredFields" as any)
      .returns(ok(new TeamsAppManifest()));
  });

  afterEach(() => {
    mocker.restore();
  });

  it("should succeed if app studio returns successfully", () =>
    provisionSpfxProjectShouldSucceed(false));

  it("should succeed if insider feature flag enabled", () =>
    provisionSpfxProjectShouldSucceed(true));

  async function provisionSpfxProjectShouldSucceed(insiderEnabled = false): Promise<void> {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.root = "./tests/plugins/resource/appstudio/spfx-resources/";
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "SPFx",
        version: "1.0",
        activeResourcePlugins: [spfxPlugin.name, appStudioPlugin.name],
      },
    };
    mocker.stub(process, "env").get(() => {
      return { TEAMSFX_INSIDER_PREVIEW: insiderEnabled.toString() };
    });

    expect(mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be
      .undefined;
    expect(mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.get(REMOTE_TEAMS_APP_ID)).to.be.undefined;
    const result = await solution.provision(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be
      .true;

    if (insiderEnabled) {
      expect(mockedCtx.envInfo.state.get("fx-resource-appstudio")?.get("teamsAppId")).equals(
        mockedAppDef.teamsAppId
      );
    } else {
      expect(mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.get(REMOTE_TEAMS_APP_ID)).equals(
        mockedAppDef.teamsAppId
      );
    }
    expect(solution.runningState).equals(SolutionRunningState.Idle);
  }
});

function mockAzureProjectDeps(
  mocker: sinon.SinonSandbox,
  permissionsJsonPath: string,
  mockedManifest: typeof validManifest,
  mockedAppDef: IAppDefinition
) {
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
  mocker.stub(solutionUtil, "getSubsriptionDisplayName").resolves(mockedSubscriptionName);
}

describe("Resource group creation failed for provision() in Azure projects", () => {
  const mocker = sinon.createSandbox();
  const permissionsJsonPath = "./permissions.json";
  const mockedAppDef: IAppDefinition = {
    appName: "MyApp",
    teamsAppId: "qwertasdf",
  };
  const mockedManifest = _.cloneDeep(validManifest);
  // ignore icons for simplicity
  mockedManifest.icons.color = "";
  mockedManifest.icons.outline = "";
  beforeEach(() => {
    mockAzureProjectDeps(mocker, permissionsJsonPath, mockedManifest, mockedAppDef);
    mocker.stub(ResourceGroups.prototype, "createOrUpdate").throws("some error");
    mocker.stub(ResourceGroups.prototype, "checkExistence").resolves({
      body: false,
    } as armResources.ResourceManagementModels.ResourcesCheckExistenceResponse);
  });

  afterEach(() => {
    mocker.restore();
  });

  it("should return UserError if createOrUpdate throws", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [fehostPlugin.name, aadPlugin.name, appStudioPlugin.name],
      },
    };

    if (!isArmSupportEnabled()) {
      const result = await solution.provision(mockedCtx);
      expect(result.isErr()).to.be.true;
      expect(result._unsafeUnwrapErr() instanceof UserError).to.be.true;
      expect(result._unsafeUnwrapErr().name).equals(SolutionError.FailedToCreateResourceGroup);
      expect(result._unsafeUnwrapErr().message).contains(
        "Failed to create resource group my_app-rg due to some error"
      );
    } else {
      mockedCtx!.answers!.targetResourceGroupName = "test-new-rg";
      const result = await solution.provision(mockedCtx);
      expect(result.isErr()).to.be.true;
      expect(result._unsafeUnwrapErr() instanceof UserError).to.be.true;
      expect(result._unsafeUnwrapErr().name).equals(SolutionError.ResourceGroupNotFound);
      expect(result._unsafeUnwrapErr().message).contains(
        "please specify an existing resource group."
      );
    }
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
    mockAzureProjectDeps(mocker, permissionsJsonPath, mockedManifest, mockedAppDef);
    mocker.stub(ResourceGroups.prototype, "createOrUpdate").resolves({ name: resourceGroupName });
    mocker
      .stub(ResourceGroups.prototype, "get")
      .resolves({ name: "my_app-rg", location: "West US" });
  });

  afterEach(() => {
    mocker.restore();
  });

  it("should succeed if app studio returns successfully", async () => {
    const solution = new TeamsAppSolution();
    // const mockedCtx = mockSolutionContext();
    const mockNewResourceGroupName = "test-new-rg";
    const mockNewResourceGroupLocation = "West US";
    const mockedCtx = mockCtxWithResourceGroupQuestions(
      true,
      mockNewResourceGroupName,
      mockNewResourceGroupLocation
    );
    mockedCtx!.answers!.targetResourceGroupName = "test-new-rg";
    mockedCtx.projectSettings = {
      appName: "my app",
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

    mockProvisionThatAlwaysSucceed(appStudioPlugin);
    appStudioPlugin.postProvision = async function (
      ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return ok(mockedAppDef.teamsAppId);
    };

    aadPlugin.setApplicationInContext = function (
      ctx: PluginContext,
      _isLocalDebug?: boolean
    ): Result<any, FxError> {
      ctx.config.set(WEB_APPLICATION_INFO_SOURCE, "mockedWebApplicationInfoResouce");
      return ok(Void);
    };
    const spy = mocker.spy(aadPlugin, "setApplicationInContext");
    const stub = mocker.stub(arm, "deployArmTemplates");

    expect(mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be
      .undefined;
    expect(mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.get(REMOTE_TEAMS_APP_ID)).to.be.undefined;
    // mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set("resourceGroupName", resourceGroupName);
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set("subscriptionId", mockedSubscriptionId);
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set("tenantId", mockedTenantId);
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
    if (!isArmSupportEnabled()) {
      expect(result.isOk()).to.be.true;
      expect(spy.calledOnce).to.be.true;
      expect(mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be
        .true;
      // expect(mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.get(REMOTE_TEAMS_APP_ID)).equals(
      //   mockedAppDef.teamsAppId
      // );
    } else {
      expect(stub.called).to.be.true;
    }
  });
});

function mockListResourceGroupResult(
  mocker: sinon.SinonSandbox,
  subscriptionId: string,
  resourceGroups: string[]
) {
  mocker
    .stub(ResourceGroups.prototype, "list")
    .callsFake(
      async (
        options?: ResourceManagementModels.ResourceGroupsListOptionalParams
      ): Promise<ResourceManagementModels.ResourceGroupsListResponse> => {
        return resourceGroups.map((name) => {
          return {
            id: `/subscriptions/${subscriptionId}/resourceGroups/${name}`,
            name: name,
            location: "East US",
            type: "Microsoft.Resources/resourceGroups",
            properties: {
              provisioningState: "Succeeded",
            },
          };
        }) as ResourceManagementModels.ResourceGroupsListResponse;
      }
    );
}

function mockListLocationResult(mocker: sinon.SinonSandbox, subscriptionId: string) {
  mocker
    .stub(Subscriptions.prototype, "listLocations")
    .callsFake(
      async (
        subscriptionId: string,
        options?: msRest.RequestOptionsBase
      ): Promise<SubscriptionsListLocationsResponse> => {
        return [
          {
            id: "location",
            subscriptionId: subscriptionId,
            name: "location",
            displayName: "location",
          },
        ] as SubscriptionsListLocationsResponse;
      }
    );
}

function mockProviderGetResult(mocker: sinon.SinonSandbox) {
  mocker
    .stub(Providers.prototype, "get")
    .callsFake(
      async (
        resourceProviderNamespace: string,
        options?: ProvidersGetOptionalParams
      ): Promise<ProvidersGetResponse> => {
        return {
          id: "location",
          resourceTypes: [
            {
              resourceType: "resourceGroups",
              locations: ["location"],
            },
          ],
        } as ProvidersGetResponse;
      }
    );
}

describe("before provision() asking for resource group info", () => {
  const mocker = sinon.createSandbox();
  const resourceGroupsCreated = new Map<string, string>();
  beforeEach(() => {
    mocker.stub(solutionUtil, "getSubsriptionDisplayName").resolves(mockedSubscriptionName);
    mocker.stub(process, "env").get(() => {
      return { TEAMSFX_INSIDER_PREVIEW: "true" };
    });
  });

  afterEach(() => {
    mocker.restore();
  });

  it("should create new resource group happy path", async () => {
    // Arrange
    const fakeSubscriptionId = "3b8db46f-4298-458a-ac36-e04e7e66b68f";
    const mockNewResourceGroupName = "test-new-rg";
    const mockNewResourceGroupLocation = "West US";
    const appName = "testapp";

    const mockedCtx = mockCtxWithResourceGroupQuestions(
      true,
      mockNewResourceGroupName,
      mockNewResourceGroupLocation
    );
    mockListResourceGroupResult(mocker, fakeSubscriptionId, []);
    mockListLocationResult(mocker, fakeSubscriptionId);
    mockProviderGetResult(mocker);

    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [],
      },
    };

    const token = await mockedCtx.azureAccountProvider?.getAccountCredentialAsync();
    expect(token).to.exist;
    const mockRmClient = new ResourceManagementClient(token!, fakeSubscriptionId);

    // Act
    const resourceGroupInfoResult = await askResourceGroupInfo(
      mockedCtx,
      mockRmClient,
      mockedCtx.answers!,
      mockedCtx.ui!,
      appName
    );

    // Assume
    expect(resourceGroupInfoResult.isOk()).to.be.true;

    const resourceGroupInfo = resourceGroupInfoResult._unsafeUnwrap();

    expect(resourceGroupInfo.createNewResourceGroup).to.be.true;
    expect(resourceGroupInfo.name).to.equal(mockNewResourceGroupName);
    expect(resourceGroupInfo.createNewResourceGroup && resourceGroupInfo.location).to.equal(
      mockNewResourceGroupLocation
    );
  });

  it("should use existing resource group happy path", async () => {
    // Arrange
    const fakeSubscriptionId = "3b8db46f-4298-458a-ac36-e04e7e66b68f";
    const mockResourceGroupName = "test-existing-rg";
    const mockResourceGroupList = ["test1", "test-existing-rg", "test2"];
    const appName = "testapp";

    const mockedCtx = mockCtxWithResourceGroupQuestions(false, mockResourceGroupName);
    mockListResourceGroupResult(mocker, fakeSubscriptionId, mockResourceGroupList);
    mockListLocationResult(mocker, fakeSubscriptionId);
    mockProviderGetResult(mocker);

    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [],
      },
    };

    const token = await mockedCtx.azureAccountProvider?.getAccountCredentialAsync();
    expect(token).to.exist;
    const mockRmClient = new ResourceManagementClient(token!, fakeSubscriptionId);

    // Act
    const resourceGroupInfoResult = await askResourceGroupInfo(
      mockedCtx,
      mockRmClient,
      mockedCtx.answers!,
      mockedCtx.ui!,
      appName
    );

    // Assume
    expect(resourceGroupInfoResult.isOk()).to.be.true;

    const resourceGroupInfo = resourceGroupInfoResult._unsafeUnwrap();

    expect(resourceGroupInfo.createNewResourceGroup).to.be.false;
    expect(resourceGroupInfo.name).to.equal(mockResourceGroupName);
  });

  it("should return correct error on failure when listing resource groups", async () => {
    // Arrange
    const fakeSubscriptionId = "3b8db46f-4298-458a-ac36-e04e7e66b68f";
    const mockResourceGroupName = "test-existing-rg";
    const appName = "testapp";

    const mockedCtx = mockCtxWithResourceGroupQuestions(false, mockResourceGroupName);

    mocker
      .stub(ResourceGroups.prototype, "list")
      .callsFake(
        async (
          options?: ResourceManagementModels.ResourceGroupsListOptionalParams
        ): Promise<ResourceManagementModels.ResourceGroupsListResponse> => {
          throw new Error("mock failure to list resource groups");
        }
      );

    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [],
      },
    };

    const token = await mockedCtx.azureAccountProvider?.getAccountCredentialAsync();
    expect(token).to.exist;
    const mockRmClient = new ResourceManagementClient(token!, fakeSubscriptionId);

    // Act
    const resourceGroupInfoResult = await askResourceGroupInfo(
      mockedCtx,
      mockRmClient,
      mockedCtx.answers!,
      mockedCtx.ui!,
      appName
    );

    // Assume
    expect(resourceGroupInfoResult.isErr()).to.be.true;
    expect(resourceGroupInfoResult._unsafeUnwrapErr().name).to.equal(
      SolutionError.FailedToListResourceGroup
    );
  });
});

describe("API v2 implementation", () => {
  describe("SPFx projects", () => {
    it("should work on happy path", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionSPFx.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [spfxPluginV2.name],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: "./",
      };
      const mockedTokenProvider: TokenProvider = {
        azureAccountProvider: new MockedAzureTokenProvider(),
        appStudioToken: new MockedAppStudioTokenProvider(),
        graphTokenProvider: new MockedGraphTokenProvider(),
        sharepointTokenProvider: new MockedSharepointProvider(),
      };
      const mockedEnvInfo: EnvInfoV2 = {
        envName: "default",
        config: { manifest: { appName: { short: "test-app" } } },
        state: {},
      };
      mockProvisionV2ThatAlwaysSucceed(spfxPluginV2);
      mockProvisionV2ThatAlwaysSucceed(appStudioPluginV2);

      const solution = new TeamsAppSolutionV2();
      const result = await solution.provisionResources(
        mockedCtx,
        mockedInputs,
        mockedEnvInfo,
        mockedTokenProvider
      );
      expect(result.kind).equals("success");
    });
  });

  describe("Azure projects", () => {
    const mocker = sinon.createSandbox();

    beforeEach(() => {
      mocker.stub(ResourceGroups.prototype, "createOrUpdate").resolves({ name: "my_app-rg" });
      mocker.stub(ResourceGroups.prototype, "checkExistence").resolves({
        body: false,
      } as armResources.ResourceManagementModels.ResourcesCheckExistenceResponse);
    });
    afterEach(() => {
      mocker.restore();
    });

    it("should work on happy path", async () => {
      if (isArmSupportEnabled()) {
        return;
      }
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [fehostPluginV2.name, appStudioPluginV2.name, aadPluginV2.name],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      mockedCtx.userInteraction = new MockUserInteraction();
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: "./",
      };
      const mockedTokenProvider: TokenProvider = {
        azureAccountProvider: new MockedAzureTokenProvider(),
        appStudioToken: new MockedAppStudioTokenProvider(),
        graphTokenProvider: new MockedGraphTokenProvider(),
        sharepointTokenProvider: new MockedSharepointProvider(),
      };
      const mockedEnvInfo: EnvInfoV2 = {
        envName: "default",
        config: { manifest: { appName: { short: "test-app" } } },
        state: {},
      };
      mockProvisionV2ThatAlwaysSucceed(fehostPluginV2);
      mockProvisionV2ThatAlwaysSucceed(appStudioPluginV2);
      mockProvisionV2ThatAlwaysSucceed(aadPluginV2);

      const solution = new TeamsAppSolutionV2();
      const result = await solution.provisionResources(
        mockedCtx,
        mockedInputs,
        mockedEnvInfo,
        mockedTokenProvider
      );
      expect(result.kind).equals("success");
    });
  });
});
