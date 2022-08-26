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
  Func,
  ProjectSettings,
  Inputs,
  v2,
  ok,
  TokenProvider,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import {
  AddSsoParameters,
  GLOBAL_CONFIG,
  SolutionError,
} from "../../../src/plugins/solution/fx-solution/constants";
import {
  MockedM365Provider,
  MockedV2Context,
  mockPublishThatAlwaysSucceed,
  mockV2PublishThatAlwaysSucceed,
  mockScaffoldCodeThatAlwaysSucceeds,
  MockedAzureAccountProvider,
  mockExecuteUserTaskThatAlwaysSucceeds,
} from "./util";
import _ from "lodash";
import { ResourcePluginsV2 } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import Container from "typedi";
import * as uuid from "uuid";
import {
  ApiConnectionOptionItem,
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceSQL,
  AzureSolutionQuestionNames,
  BotOptionItem,
  CicdOptionItem,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  TabSsoItem,
  TabNonSsoItem,
  TabOptionItem,
  BotSsoItem,
  MessageExtensionItem,
  SingleSignOnOptionItem,
  TabSPFxNewUIItem,
} from "../../../src/plugins/solution/fx-solution/question";
import { executeUserTask } from "../../../src/plugins/solution/fx-solution/v2/executeUserTask";
import "../../../src/plugins/resource/function/v2";
import "../../../src/plugins/resource/sql/v2";
import "../../../src/plugins/resource/apim/v2";
import "../../../src/plugins/resource/localdebug/v2";
import "../../../src/plugins/resource/appstudio/v2";
import "../../../src/plugins/resource/frontend/v2";
import "../../../src/plugins/resource/bot/v2";
import { newEnvInfo } from "../../../src";
import fs from "fs-extra";
import { ProgrammingLanguage } from "../../../src/plugins/resource/bot/enums/programmingLanguage";
import { randomAppName } from "../../core/utils";
import { ScaffoldingContextAdapter } from "../../../src/plugins/solution/fx-solution/v2/adaptor";
import { LocalCrypto } from "../../../src/core/crypto";
import { appStudioPlugin, botPlugin, fehostPlugin } from "../../constants";
import { BuiltInFeaturePluginNames } from "../../../src/plugins/solution/fx-solution/v3/constants";
import { armV2 } from "../../../src/plugins/solution/fx-solution/arm";
import { NamedArmResourcePlugin } from "../../../src/common/armInterface";
import * as featureFlags from "../../../src/common/featureFlags";
import * as os from "os";
import * as path from "path";
import mockedEnv from "mocked-env";
import { AppManifest } from "../../../src/component/resource/appManifest/appManifest";
import { ComponentNames } from "../../../src/component/constants";
const tool = require("../../../src/common/tools");

chai.use(chaiAsPromised);
const expect = chai.expect;

const functionPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.FunctionPlugin);
const sqlPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.SqlPlugin);
const apimPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.ApimPlugin);
const localDebugPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.LocalDebugPlugin);
const appStudioPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);
const frontendPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.FrontendPlugin);
const botPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.BotPlugin);
const aadPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AadPlugin);
const cicdPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.CICDPlugin);
const spfxPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.SpfxPlugin);
const mockedProvider: TokenProvider = {
  azureAccountProvider: new MockedAzureAccountProvider(),
  m365TokenProvider: new MockedM365Provider(),
};
function mockSolutionContextWithPlatform(platform?: Platform): SolutionContext {
  const config: SolutionConfig = new Map();
  config.set(GLOBAL_CONFIG, new ConfigMap());
  return {
    root: ".",
    envInfo: newEnvInfo(),
    answers: { platform: platform ? platform : Platform.VSCode },
    projectSettings: undefined,
    cryptoProvider: new LocalCrypto(""),
  };
}

describe("executeUserTask VSpublish", async () => {
  it("should return error for non-vs platform", async () => {
    const mockedCtx = mockSolutionContextWithPlatform(Platform.VSCode);
    const solution = new TeamsAppSolution();
    const func: Func = {
      namespace: "solution",
      method: "VSpublish",
    };
    let result = await solution.executeUserTask(func, mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.UnsupportedPlatform);

    mockedCtx.answers!.platform = Platform.CLI;
    result = await solution.executeUserTask(func, mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.UnsupportedPlatform);

    // mockedCtx.answers!.platform = undefined;
    // result = await solution.executeUserTask(func, mockedCtx);
    // expect(result.isErr()).to.be.true;
    // expect(result._unsafeUnwrapErr().name).equals(SolutionError.UnsupportedPlatform);
  });

  describe("happy path", async () => {
    const mocker = sinon.createSandbox();

    beforeEach(() => {});

    afterEach(() => {
      mocker.restore();
    });

    it("should return ok", async () => {
      const mockedCtx = mockSolutionContextWithPlatform(Platform.VS);
      const solution = new TeamsAppSolution();
      const func: Func = {
        namespace: "solution",
        method: "VSpublish",
      };
      mockPublishThatAlwaysSucceed(appStudioPlugin);
      const spy = mocker.spy(appStudioPlugin, "publish");
      const result = await solution.executeUserTask(func, mockedCtx);
      expect(result.isOk()).to.be.true;
      expect(spy.calledOnce).to.be.true;
    });
  });
});

describe("V2 implementation", () => {
  const mocker = sinon.createSandbox();
  const testFolder = "./tests/plugins/solution/testproject/usertask";
  beforeEach(async () => {
    await fs.ensureDir(testFolder);
    mocker.stub<any, any>(fs, "copy").resolves();
    mocker
      .stub<any, any>(armV2, "generateArmTemplate")
      .callsFake(async (ctx: SolutionContext, selectedPlugins: NamedArmResourcePlugin[] = []) => {
        return ok(undefined);
      });
  });
  afterEach(async () => {
    await fs.remove(testFolder);
    mocker.restore();
  });
  it("should return err if given invalid router", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [appStudioPlugin.name],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
    };

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "someInvalidNamespace", method: "invalid" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals("executeUserTaskRouteFailed");
  });

  it("should return err when trying to add capability for SPFx project", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [appStudioPlugin.name],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
    };

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addCapability" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.AddCapabilityNotSupport);
  });

  it("should return err when trying to add resource for SPFx project", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [appStudioPlugin.name],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);

    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
    };

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addResource" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.AddResourceNotSupport);
  });

  it("should return err when trying to capability if exceed limit", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [botPlugin.name],
        capabilities: [BotOptionItem.id],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = { platform: Platform.VSCode };
    mockedInputs[AzureSolutionQuestionNames.Capabilities] = [BotOptionItem.id];
    const appStudioPlugin = Container.get<AppManifest>(ComponentNames.AppManifest);
    mocker.stub<any, any>(appStudioPlugin, "capabilityExceedLimit").resolves(ok(true));
    mocker.stub<any, any>(appStudioPlugin, "addCapability").resolves(ok(undefined));
    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addCapability" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    expect(result.isErr() && result.error.name === SolutionError.FailedToAddCapability).to.be.true;
  });
  it("should return err when trying to add bot capability repeatedly", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [botPlugin.name],
        capabilities: [BotOptionItem.id],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = { platform: Platform.VSCode };
    mockedInputs[AzureSolutionQuestionNames.Capabilities] = [BotOptionItem.id];
    const appStudioPlugin = Container.get<AppManifest>(ComponentNames.AppManifest);
    mocker.stub<any, any>(appStudioPlugin, "capabilityExceedLimit").resolves(ok(false));
    mocker.stub<any, any>(appStudioPlugin, "addCapability").resolves(ok(undefined));
    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addCapability" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    expect(result.isOk()).to.be.true;
  });
  it("should return ok when adding tab to bot project", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [appStudioPlugin.name, botPlugin.name],
        capabilities: [BotOptionItem.id],
        azureResources: [],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
    };
    mockedInputs[AzureSolutionQuestionNames.Capabilities] = [TabOptionItem.id];

    mockScaffoldCodeThatAlwaysSucceeds(appStudioPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(localDebugPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(frontendPluginV2);
    const insiderPreviewFlag = process.env.TEAMSFX_INSIDER_PREVIEW;
    if (insiderPreviewFlag) return;
    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addCapability" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    // expect(result.isOk()).to.be.true;
  });

  it("should return ok when adding resource's input is empty", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [appStudioPluginV2.name],
        capabilities: [TabOptionItem.id],
        azureResources: [],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
    };

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addResource" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    expect(result.isOk()).to.be.true;
  });

  it("should return ok when adding SQL resource repeatedly", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [appStudioPluginV2.name, frontendPluginV2.name, sqlPluginV2.name],
        capabilities: [TabOptionItem.id],
        azureResources: [AzureResourceSQL.id],
      },
      programmingLanguage: "javascript",
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };

    mockedInputs[AzureSolutionQuestionNames.AddResources] = [AzureResourceSQL.id];

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addResource" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    expect(result.isOk()).to.be.true;
  });

  it("should return error when adding APIM resource repeatedly", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [appStudioPluginV2.name, frontendPluginV2.name, apimPluginV2.name],
        capabilities: [TabOptionItem.id],
        azureResources: [AzureResourceApim.id],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
    };

    mockedInputs[AzureSolutionQuestionNames.AddResources] = [AzureResourceApim.id];

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addResource" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    expect(result.isErr()).to.be.true;
  });
  it("should return ok when adding APIM resource to a project without APIM and Function", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [appStudioPluginV2.name, frontendPluginV2.name],
        capabilities: [TabOptionItem.id],
        azureResources: [],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    mockedCtx.projectSetting.programmingLanguage = ProgrammingLanguage.JavaScript;
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
    };

    mockedInputs[AzureSolutionQuestionNames.AddResources] = [AzureResourceApim.id];

    mockScaffoldCodeThatAlwaysSucceeds(appStudioPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(localDebugPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(apimPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(functionPluginV2);

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addResource" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    expect(result.isOk()).to.be.true;
  });
  it("should return ok when adding APIM resource to a project without APIM but with Function", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [appStudioPluginV2.name, frontendPluginV2.name],
        capabilities: [TabOptionItem.id],
        azureResources: [AzureResourceFunction.id],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    mockedCtx.projectSetting.programmingLanguage = ProgrammingLanguage.JavaScript;
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
    };

    mockedInputs[AzureSolutionQuestionNames.AddResources] = [AzureResourceApim.id];

    mockScaffoldCodeThatAlwaysSucceeds(appStudioPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(localDebugPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(apimPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(functionPluginV2);

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addResource" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    expect(result.isOk()).to.be.true;
  });

  it("should return ok when adding APIM resource to a project without APIM but with Function using addFeature", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [appStudioPluginV2.name, frontendPluginV2.name],
        capabilities: [TabOptionItem.id],
        azureResources: [AzureResourceFunction.id],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    mockedCtx.projectSetting.programmingLanguage = ProgrammingLanguage.JavaScript;
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
    };

    mockedInputs[AzureSolutionQuestionNames.Features] = AzureResourceApim.id;

    mockScaffoldCodeThatAlwaysSucceeds(appStudioPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(localDebugPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(apimPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(functionPluginV2);

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addFeature" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    expect(result.isOk()).to.be.true;
  });

  it("should return ok when adding SQL resource to a project without SQL", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [appStudioPluginV2.name, frontendPluginV2.name],
        capabilities: [TabOptionItem.id],
        azureResources: [],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    mockedCtx.projectSetting.programmingLanguage = ProgrammingLanguage.JavaScript;
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
    };

    mockedInputs[AzureSolutionQuestionNames.AddResources] = [AzureResourceSQL.id];

    mockScaffoldCodeThatAlwaysSucceeds(appStudioPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(localDebugPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(sqlPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(functionPluginV2);

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addResource" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    expect(result.isOk()).to.be.true;
  });

  it("should return err when adding tab to non sso tab when aad manifest enabled", async () => {
    mocker.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
    const appStudioPlugin = Container.get<AppManifest>(ComponentNames.AppManifest);
    mocker.stub<any, any>(appStudioPlugin, "capabilityExceedLimit").resolves(ok(false));
    mocker.stub<any, any>(appStudioPlugin, "addCapability").resolves(ok(undefined));

    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [frontendPluginV2.name],
        capabilities: [TabOptionItem.id],
        azureResources: [],
      },
    };

    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
    };
    mockedInputs[AzureSolutionQuestionNames.Capabilities] = [TabOptionItem.id];

    mockScaffoldCodeThatAlwaysSucceeds(appStudioPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(localDebugPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(frontendPluginV2);

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addCapability" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );

    expect(result.isErr() && result.error.name === SolutionError.InvalidInput).to.be.true;
  });

  it("should return err when adding non sso tab to tab when aad manifest enabled", async () => {
    mocker.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
    const appStudioPlugin = Container.get<AppManifest>(ComponentNames.AppManifest);
    mocker.stub<any, any>(appStudioPlugin, "capabilityExceedLimit").resolves(ok(false));
    mocker.stub<any, any>(appStudioPlugin, "addCapability").resolves(ok(undefined));

    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [frontendPluginV2.name, aadPluginV2.name],
        capabilities: [TabNonSsoItem.id, TabSsoItem.id],
        azureResources: [],
      },
    };

    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
    };
    mockedInputs[AzureSolutionQuestionNames.Capabilities] = [TabNonSsoItem.id];

    mockScaffoldCodeThatAlwaysSucceeds(appStudioPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(localDebugPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(frontendPluginV2);

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addCapability" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );

    expect(result.isErr() && result.error.name === SolutionError.InvalidInput).to.be.true;
  });

  it("should success when adding tab to bot when aad manifest enabled", async () => {
    mocker.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
    const appStudioPlugin = Container.get<AppManifest>(ComponentNames.AppManifest);
    mocker.stub<any, any>(appStudioPlugin, "capabilityExceedLimit").resolves(ok(false));
    mocker.stub<any, any>(appStudioPlugin, "addCapability").resolves(ok(undefined));

    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [botPluginV2.name],
        capabilities: [BotOptionItem.id],
        azureResources: [],
      },
    };

    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
    };
    mockedInputs[AzureSolutionQuestionNames.Capabilities] = [TabOptionItem.id];

    mockScaffoldCodeThatAlwaysSucceeds(appStudioPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(localDebugPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(frontendPluginV2);

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addCapability" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );

    expect(result.isOk()).to.be.true;
  });

  it("should success when adding non sso tab to bot when aad manifest enabled", async () => {
    mocker.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
    const appStudioPlugin = Container.get<AppManifest>(ComponentNames.AppManifest);
    mocker.stub<any, any>(appStudioPlugin, "capabilityExceedLimit").resolves(ok(false));
    mocker.stub<any, any>(appStudioPlugin, "addCapability").resolves(ok(undefined));
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [botPluginV2.name],
        capabilities: [BotOptionItem.id],
        azureResources: [],
      },
    };

    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
    };
    mockedInputs[AzureSolutionQuestionNames.Capabilities] = [TabNonSsoItem.id];

    mockScaffoldCodeThatAlwaysSucceeds(appStudioPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(localDebugPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(frontendPluginV2);

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addCapability" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );

    expect(result.isOk()).to.be.true;
  });

  it("should success when adding non sso tab to bot when aad manifest enabled using addFeature", async () => {
    mocker.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
    mocker.stub<any, any>(featureFlags, "isPreviewFeaturesEnabled").returns(true);
    const appStudioPlugin = Container.get<AppManifest>(ComponentNames.AppManifest);
    mocker.stub<any, any>(appStudioPlugin, "capabilityExceedLimit").resolves(ok(false));
    mocker.stub<any, any>(appStudioPlugin, "addCapability").resolves(ok(undefined));

    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [botPluginV2.name],
        capabilities: [BotOptionItem.id],
        azureResources: [],
      },
    };

    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
    };
    mockedInputs[AzureSolutionQuestionNames.Features] = TabNonSsoItem.id;

    mockScaffoldCodeThatAlwaysSucceeds(appStudioPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(localDebugPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(frontendPluginV2);

    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addFeature" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );

    expect(result.isOk()).to.be.true;
  });

  describe("executeUserTask VSpublish", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [appStudioPluginV2.name],
        capabilities: [TabOptionItem.id],
        azureResources: [],
      },
    };

    it("should return error for non-vs platform", async () => {
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
      };

      let result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "VSpublish" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );
      expect(result.isErr()).to.be.true;
      expect(result._unsafeUnwrapErr().name).equals(SolutionError.UnsupportedPlatform);

      (mockedInputs.platform = Platform.VSCode),
        (result = await executeUserTask(
          mockedCtx,
          mockedInputs,
          { namespace: "solution", method: "VSpublish" },
          {},
          { envName: "default", config: {}, state: {} },
          mockedProvider
        ));
      expect(result.isErr()).to.be.true;
      expect(result._unsafeUnwrapErr().name).equals(SolutionError.UnsupportedPlatform);
    });

    describe("happy path", async () => {
      const mocker = sinon.createSandbox();

      beforeEach(() => {});

      afterEach(() => {
        mocker.restore();
      });

      it("should return ok", async () => {
        const mockedCtx = new MockedV2Context(projectSettings);
        const mockedInputs: Inputs = {
          platform: Platform.VS,
        };

        mockV2PublishThatAlwaysSucceed(appStudioPluginV2);
        const spy = mocker.spy(appStudioPluginV2, "publishApplication");
        const result = await executeUserTask(
          mockedCtx,
          mockedInputs,
          { namespace: "solution", method: "VSpublish" },
          {},
          { envName: "default", config: {}, state: {} },
          mockedProvider
        );
        expect(result.isOk()).to.be.true;
        expect(spy.calledOnce, "publishApplication() is called").to.be.true;
      });
    });

    it("createEnv, ScaffoldingContextAdapter", async () => {
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
      };

      const result = await new ScaffoldingContextAdapter([mockedCtx, mockedInputs]);
      expect(result.answers!.platform).to.be.equal(Platform.VSCode);
    });
  });

  describe("add sso", async () => {
    let mockedEnvRestore: () => void;

    beforeEach(async () => {
      mockedEnvRestore = mockedEnv({
        TEAMSFX_AAD_MANIFEST: "true",
      });
    });

    afterEach(async () => {
      mockedEnvRestore();
    });

    it("happy path", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [appStudioPlugin.name, frontendPluginV2.name],
          capabilities: [TabOptionItem.id],
          azureResources: [],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
      };
      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addSso" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );

      expect(result.isOk()).to.be.true;
      expect(
        (
          mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings
        ).activeResourcePlugins.includes(aadPluginV2.name)
      ).to.be.true;
      expect(
        (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).capabilities.includes(
          TabSsoItem.id
        )
      ).to.be.true;
      const readmePath = path.join(testFolder, "auth", "tab", "README.md");
      const readmeExists = await fs.pathExists(readmePath);
      expect(readmeExists).to.be.true;
    });

    it("happy path: vs", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        programmingLanguage: "csharp",
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [appStudioPlugin.name, frontendPluginV2.name],
          capabilities: [TabOptionItem.id],
          azureResources: [],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VS,
        projectPath: testFolder,
      };
      const appSettingsPath = path.join(testFolder, AddSsoParameters.AppSettings);
      const appSettingsDevPath = path.join(testFolder, AddSsoParameters.AppSettingsDev);
      await fs.writeJSON(appSettingsPath, {});
      await fs.writeJSON(appSettingsDevPath, {});

      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addSso" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );

      expect(result.isOk()).to.be.true;
      expect(
        (
          mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings
        ).activeResourcePlugins.includes(aadPluginV2.name)
      ).to.be.true;
      expect(
        (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).capabilities.includes(
          TabSsoItem.id
        )
      ).to.be.true;
      const readmePath = path.join(testFolder, "Auth", "tab", "README.txt");
      const getUserProfilePath = path.join(testFolder, "Auth", "tab", "GetUserProfile.razor");
      const readmeExists = await fs.pathExists(readmePath);
      const getUserProfileExists = await fs.pathExists(getUserProfilePath);
      expect(readmeExists).to.be.true;
      expect(getUserProfileExists).to.be.true;

      const appSettingsRes = {
        TeamsFx: {
          Authentication: {
            ClientId: "$clientId$",
            ClientSecret: "$client-secret$",
            OAuthAuthority: "$oauthAuthority$",
          },
        },
      };
      const appSettings = await fs.readJSON(appSettingsPath);
      expect(JSON.stringify(appSettings)).equals(JSON.stringify(appSettingsRes));
      const appSettingsDev = await fs.readJSON(appSettingsPath);
      expect(JSON.stringify(appSettingsDev)).equals(JSON.stringify(appSettingsRes));
    });

    it("happy path: bot", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [appStudioPlugin.name, botPluginV2.name],
          capabilities: [BotOptionItem.id],
          azureResources: [],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
      };
      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addSso" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );

      expect(result.isOk()).to.be.true;
      expect(
        (
          mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings
        ).activeResourcePlugins.includes(aadPluginV2.name)
      ).to.be.true;
      expect(
        (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).capabilities.includes(
          BotSsoItem.id
        )
      ).to.be.true;
      const readmePath = path.join(testFolder, "auth", "bot", "README.md");
      const readmeExists = await fs.pathExists(readmePath);
      expect(readmeExists).to.be.true;
    });

    it("happy path: vs bot", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        programmingLanguage: "csharp",
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [appStudioPlugin.name, botPluginV2.name],
          capabilities: [BotOptionItem.id],
          azureResources: [],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VS,
        projectPath: testFolder,
      };
      const appSettingsPath = path.join(testFolder, AddSsoParameters.AppSettings);
      const appSettingsDevPath = path.join(testFolder, AddSsoParameters.AppSettingsDev);
      await fs.writeJSON(appSettingsPath, {});
      await fs.writeJSON(appSettingsDevPath, {});

      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addSso" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );

      expect(result.isOk()).to.be.true;
      expect(
        (
          mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings
        ).activeResourcePlugins.includes(aadPluginV2.name)
      ).to.be.true;
      expect(
        (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).capabilities.includes(
          BotSsoItem.id
        )
      ).to.be.true;
      const readmePath = path.join(testFolder, "Auth", "bot", "README.txt");
      const authStartPagePath = path.join(
        testFolder,
        "Auth",
        "bot",
        "Pages",
        "BotAuthorizeStartPage.cshtml"
      );
      const authEndPagePath = path.join(
        testFolder,
        "Auth",
        "bot",
        "Pages",
        "BotAuthorizeEndPage.cshtml"
      );
      const learnCardPath = path.join(
        testFolder,
        "Auth",
        "bot",
        "Resources",
        "LearnCardTemplate.json"
      );
      const welcomeCardPath = path.join(
        testFolder,
        "Auth",
        "bot",
        "Resources",
        "WelcomeCardTemplate.json"
      );
      const mainDialogPath = path.join(testFolder, "Auth", "bot", "SSO", "SsoDialog.cs");
      const teamsSsoBotPath = path.join(testFolder, "Auth", "bot", "SSO", "TeamsSsoBot.cs");
      expect(await fs.pathExists(readmePath)).to.be.true;
      expect(await fs.pathExists(authStartPagePath)).to.be.true;
      expect(await fs.pathExists(authEndPagePath)).to.be.true;
      expect(await fs.pathExists(mainDialogPath)).to.be.true;
      expect(await fs.pathExists(teamsSsoBotPath)).to.be.true;

      const appSettingsRes = {
        TeamsFx: {
          Authentication: {
            ClientId: "$clientId$",
            ClientSecret: "$client-secret$",
            OAuthAuthority: "$oauthAuthority$",
            ApplicationIdUri: "$applicationIdUri$",
            Bot: {
              InitiateLoginEndpoint: "$initiateLoginEndpoint$",
            },
          },
        },
      };
      const appSettings = await fs.readJSON(appSettingsPath);
      expect(JSON.stringify(appSettings)).equals(JSON.stringify(appSettingsRes));
      const appSettingsDev = await fs.readJSON(appSettingsPath);
      expect(JSON.stringify(appSettingsDev)).equals(JSON.stringify(appSettingsRes));
    });

    it("happy path: addFeature", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [appStudioPlugin.name, frontendPluginV2.name],
          capabilities: [TabOptionItem.id],
          azureResources: [],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
        [AzureSolutionQuestionNames.Features]: SingleSignOnOptionItem.id,
      };
      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addFeature" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );

      expect(result.isOk()).to.be.true;
      expect(
        (
          mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings
        ).activeResourcePlugins.includes(aadPluginV2.name)
      ).to.be.true;
      expect(
        (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).capabilities.includes(
          TabSsoItem.id
        )
      ).to.be.true;
      const readmePath = path.join(testFolder, "auth", "tab", "README.md");
      const readmeExists = await fs.pathExists(readmePath);
      expect(readmeExists).to.be.true;
    });

    it("should return error when sso is enabled", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [appStudioPlugin.name, frontendPluginV2.name, aadPluginV2.name],
          capabilities: [TabOptionItem.id, TabSsoItem.id],
          azureResources: [],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
      };
      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addSso" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );
      expect(result.isErr() && result.error.name === SolutionError.SsoEnabled).to.be.true;
    });

    it("should success when no capability", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [],
          capabilities: [],
          azureResources: [],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
      };
      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addSso" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );
      expect(result.isOk()).to.be.true;
      expect(
        (
          mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings
        ).activeResourcePlugins.includes(aadPluginV2.name)
      ).to.be.true;
    });

    it("should return error when project setting is invalid", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [appStudioPlugin.name, frontendPluginV2.name, aadPluginV2.name],
          capabilities: [TabOptionItem.id],
          azureResources: [],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
      };
      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addSso" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );
      expect(result.isErr() && result.error.name === SolutionError.InvalidSsoProject).to.be.true;
    });

    it("should return error when bot is host on Azure Function", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [appStudioPlugin.name, botPluginV2.name],
          capabilities: [BotOptionItem.id],
          azureResources: [],
        },
        pluginSettings: {
          "fx-resource-bot": {
            "host-type": "azure-functions",
            capabilities: [],
          },
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
      };
      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addSso" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );
      expect(result.isErr() && result.error.name === SolutionError.AddSsoNotSupported).to.be.true;
    });

    it("delete added files when failed", async () => {
      mocker.stub<any, any>(fs, "writeFile").rejects(new Error());
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [appStudioPlugin.name, frontendPluginV2.name],
          capabilities: [TabOptionItem.id],
          azureResources: [],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
      };
      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addSso" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );

      expect(result.isOk()).to.be.false;
      const readmePath = path.join(testFolder, "auth", "tab", "README.md");
      const readmeExists = await fs.pathExists(readmePath);
      expect(readmeExists).to.be.false;
    });

    it("should return error when only messaging extension", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [appStudioPlugin.name, botPluginV2.name],
          capabilities: [MessageExtensionItem.id],
          azureResources: [],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
      };
      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addSso" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );
      console.log(result);
      expect(result.isErr() && result.error.name === SolutionError.AddSsoNotSupported).to.be.true;
    });

    it("should success on bot and messaging extension project", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [appStudioPlugin.name, botPluginV2.name],
          capabilities: [BotOptionItem.id, MessageExtensionItem.id],
          azureResources: [],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
      };
      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addSso" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );

      expect(result.isOk()).to.be.true;
      expect(
        (
          mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings
        ).activeResourcePlugins.includes(aadPluginV2.name)
      ).to.be.true;
      expect(
        (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).capabilities.includes(
          BotSsoItem.id
        )
      ).to.be.true;
      const readmePath = path.join(testFolder, "auth", "bot", "README.md");
      const readmeExists = await fs.pathExists(readmePath);
      expect(readmeExists).to.be.true;
    });

    it("should success on tab and messaging extension project", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [appStudioPlugin.name, botPluginV2.name, frontendPluginV2.name],
          capabilities: [TabOptionItem.id, MessageExtensionItem.id],
          azureResources: [],
        },
      };
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
      };
      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addSso" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );

      expect(result.isOk()).to.be.true;
      expect(
        (
          mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings
        ).activeResourcePlugins.includes(aadPluginV2.name)
      ).to.be.true;
      expect(
        (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).capabilities.includes(
          TabSsoItem.id
        )
      ).to.be.true;
      const readmePath = path.join(testFolder, "auth", "tab", "README.md");
      const readmeExists = await fs.pathExists(readmePath);
      expect(readmeExists).to.be.true;
    });
  });

  describe("add feature", async () => {
    it("should call cicd plugin when choose cicd option", async () => {
      mocker
        .stub<any, any>(cicdPluginV2, "executeUserTask")
        .returns(Promise.resolve(ok(undefined)));
      mocker.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [botPluginV2.name],
          capabilities: [BotOptionItem.id],
          azureResources: [],
        },
      };

      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
      };
      mockedInputs[AzureSolutionQuestionNames.Features] = CicdOptionItem.id;

      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addFeature" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );

      expect(result.isOk()).to.be.true;
    });

    it("should call spfx plugin when choose spfx option", async () => {
      const mockedEnvRestore = mockedEnv({ TEAMSFX_SPFX_MULTI_TAB: "true" });
      mocker
        .stub<any, any>(spfxPluginV2, "scaffoldSourceCode")
        .returns(Promise.resolve(ok(undefined)));
      mocker.stub(AppManifest.prototype, "capabilityExceedLimit").resolves(ok(false));
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionSPFx.id,
          name: "test",
          version: "1.0",
          activeResourcePlugins: [spfxPluginV2.name],
          capabilities: [TabSPFxNewUIItem.id],
          azureResources: [],
        },
      };

      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: testFolder,
      };
      mockedInputs[AzureSolutionQuestionNames.Features] = TabSPFxNewUIItem.id;

      const result = await executeUserTask(
        mockedCtx,
        mockedInputs,
        { namespace: "solution", method: "addFeature" },
        {},
        { envName: "default", config: {}, state: {} },
        mockedProvider
      );

      expect(result.isOk()).to.be.true;
      mockedEnvRestore();
    });
  });
});
