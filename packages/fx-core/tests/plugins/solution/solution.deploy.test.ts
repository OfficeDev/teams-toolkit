// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import { SolutionRunningState, TeamsAppSolution } from " ../../../src/plugins/solution";
import {
  ConfigFolderName,
  FxError,
  ok,
  PluginContext,
  Result,
  SolutionContext,
  Void,
  Plugin,
  Platform,
  ProjectSettings,
  Inputs,
  Json,
  TokenProvider,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import fs from "fs-extra";
import {
  GLOBAL_CONFIG,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../../../src/plugins/solution/fx-solution/constants";
import { REMOTE_MANIFEST } from "../../../src/plugins/resource/appstudio/constants";
import {
  AzureSolutionQuestionNames,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import {
  MockedAppStudioTokenProvider,
  MockedAzureAccountProvider,
  MockedGraphTokenProvider,
  MockedSharepointProvider,
  MockedV2Context,
  validManifest,
} from "./util";
import _ from "lodash";
import * as uuid from "uuid";
import { AadAppForTeamsPlugin } from "../../../src/plugins/resource/aad";
import { newEnvInfo } from "../../../src/core/tools";
import { deploy } from "../../../src/plugins/solution/fx-solution/v2/deploy";
import { EnvInfoV2 } from "@microsoft/teamsfx-api/build/v2";
import { LocalCrypto } from "../../../src/core/crypto";
import { aadPlugin, fehostPlugin, spfxPlugin } from "../../constants";

chai.use(chaiAsPromised);
const expect = chai.expect;
function mockSolutionContext(): SolutionContext {
  return {
    root: ".",
    envInfo: newEnvInfo(),
    answers: { platform: Platform.VSCode },
    projectSettings: undefined,
    cryptoProvider: new LocalCrypto(""),
  };
}

export function mockDeployThatAlwaysSucceed(plugin: Plugin) {
  plugin.preDeploy = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  };
  plugin.deploy = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  };
  plugin.postDeploy = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  };
}

describe("deploy() for Azure projects", () => {
  it("should return error if an Azure project hasn't been provisioned", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [new AadAppForTeamsPlugin().name],
      },
    };
    const result = await solution.deploy(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.CannotDeployBeforeProvision);
  });

  it("should return error if manifest file is not found", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    const mockedProvider = new MockedAzureAccountProvider();
    mockedCtx.azureAccountProvider = mockedProvider;
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [aadPlugin.name],
      },
    };
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
    const result = await solution.deploy(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals("NoResourcePluginSelected");
  });

  describe("with valid manifest", () => {
    const mocker = sinon.createSandbox();
    const mockedManifest = _.cloneDeep(validManifest);
    // ignore icons for simplicity
    mockedManifest.icons.color = "";
    mockedManifest.icons.outline = "";
    beforeEach(() => {
      mocker
        .stub<any, any>(fs, "readJson")
        .withArgs(`./.${ConfigFolderName}/${REMOTE_MANIFEST}`)
        .resolves(mockedManifest);
    });

    afterEach(() => {
      mocker.restore();
    });

    it("should return error if no resource is selected to deploy", async () => {
      const solution = new TeamsAppSolution();
      const mockedCtx = mockSolutionContext();
      const mockedProvider = new MockedAzureAccountProvider();
      mockedCtx.azureAccountProvider = mockedProvider;
      mockedCtx.projectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [aadPlugin.name],
        },
      };
      mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      const result = await solution.deploy(mockedCtx);
      expect(result.isErr()).to.be.true;
      expect(result._unsafeUnwrapErr().name).equals(SolutionError.NoResourcePluginSelected);
    });

    it("should return ok on happy path and set solution status to idle", async () => {
      const solution = new TeamsAppSolution();
      const mockedCtx = mockSolutionContext();
      const mockedProvider = new MockedAzureAccountProvider();
      mockedCtx.azureAccountProvider = mockedProvider;
      mockedCtx.projectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [aadPlugin.name],
        },
      };
      mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      mockedCtx.answers![AzureSolutionQuestionNames.PluginSelectionDeploy] = [fehostPlugin.name];
      mockDeployThatAlwaysSucceed(fehostPlugin);

      const result = await solution.deploy(mockedCtx);
      expect(result.isOk()).to.be.true;
      expect(solution.runningState).equals(SolutionRunningState.Idle);
    });
  });
});

describe("deploy() for SPFx projects", () => {
  const mocker = sinon.createSandbox();
  const mockedManifest = _.cloneDeep(validManifest);
  // ignore icons for simplicity
  mockedManifest.icons.color = "";
  mockedManifest.icons.outline = "";
  beforeEach(() => {
    mocker
      .stub<any, any>(fs, "readJson")
      .withArgs(`./.${ConfigFolderName}/${REMOTE_MANIFEST}`)
      .resolves(mockedManifest);
  });

  afterEach(() => {
    mocker.restore();
  });

  it("doesn't require provision first and should return error if no resource is selected to deploy", async () => {
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
    const result = await solution.deploy(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.NoResourcePluginSelected);
  });

  it("doesn't require provision first and should return ok on happy path and set solution status to idle", async () => {
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
    mockedCtx.answers![AzureSolutionQuestionNames.PluginSelectionDeploy] = [fehostPlugin.name];
    mockDeployThatAlwaysSucceed(fehostPlugin);

    const result = await solution.deploy(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(solution.runningState).equals(SolutionRunningState.Idle);
  });
});

describe("API v2 cases: deploy() for Azure projects", () => {
  const mocker = sinon.createSandbox();

  beforeEach(() => {});

  afterEach(() => {
    mocker.restore();
  });

  it("should return error if an Azure project hasn't been provisioned", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [new AadAppForTeamsPlugin().name],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      appStudioToken: new MockedAppStudioTokenProvider(),
      graphTokenProvider: new MockedGraphTokenProvider(),
      sharepointTokenProvider: new MockedSharepointProvider(),
    };
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
    };
    const envInfo: EnvInfoV2 = {
      envName: "default",
      config: {},
      state: {
        solution: {},
      },
    };
    const result = await deploy(mockedCtx, mockedInputs, envInfo, mockedTokenProvider);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.CannotDeployBeforeProvision);
  });

  it("should return error if no resource is selected to deploy", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [new AadAppForTeamsPlugin().name],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      appStudioToken: new MockedAppStudioTokenProvider(),
      graphTokenProvider: new MockedGraphTokenProvider(),
      sharepointTokenProvider: new MockedSharepointProvider(),
    };
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
    };
    const envInfo: EnvInfoV2 = {
      envName: "default",
      config: {},
      state: {
        solution: { provisionSucceeded: true },
      },
    };
    const result = await deploy(mockedCtx, mockedInputs, envInfo, mockedTokenProvider);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.NoResourcePluginSelected);
  });

  it("shouldn't return error if no resource is selected to deploy on VS", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [new AadAppForTeamsPlugin().name],
      },
      // Whether this project is on VS platform is determined by programmingLanguage
      programmingLanguage: "csharp",
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      appStudioToken: new MockedAppStudioTokenProvider(),
      graphTokenProvider: new MockedGraphTokenProvider(),
      sharepointTokenProvider: new MockedSharepointProvider(),
    };
    const mockedInputs: Inputs = {
      platform: Platform.VS,
    };
    const envInfo: EnvInfoV2 = {
      envName: "default",
      config: {},
      state: {
        solution: { provisionSucceeded: true },
      },
    };
    const result = await deploy(mockedCtx, mockedInputs, envInfo, mockedTokenProvider);
    expect(result.isOk()).to.be.true;
  });

  it("should return ok on happy path", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        capabilities: [TabOptionItem.id],
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [new AadAppForTeamsPlugin().name, fehostPlugin.name],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      appStudioToken: new MockedAppStudioTokenProvider(),
      graphTokenProvider: new MockedGraphTokenProvider(),
      sharepointTokenProvider: new MockedSharepointProvider(),
    };
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "mock",
    };
    mockedInputs[AzureSolutionQuestionNames.PluginSelectionDeploy] = [fehostPlugin.name];
    const envInfo: EnvInfoV2 = {
      envName: "default",
      config: {},
      state: {
        solution: { provisionSucceeded: true },
      },
    };
    mockDeployThatAlwaysSucceed(fehostPlugin);
    const result = await deploy(mockedCtx, mockedInputs, envInfo, mockedTokenProvider);

    expect(result.isOk()).to.be.true;
  });
});
