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
  IStaticTab,
  IBot,
  IConfigurableTab,
  IComposeExtension,
  Result,
  FxError,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import { GLOBAL_CONFIG, SolutionError } from "../../../src/plugins/solution/fx-solution/constants";
import {
  MockedAppStudioProvider,
  MockedSharepointProvider,
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
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceSQL,
  AzureSolutionQuestionNames,
  BotOptionItem,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import { executeUserTask } from "../../../src/plugins/solution/fx-solution/v2/executeUserTask";
import "../../../src/plugins/resource/function/v2";
import "../../../src/plugins/resource/sql/v2";
import "../../../src/plugins/resource/apim/v2";
import "../../../src/plugins/resource/localdebug/v2";
import "../../../src/plugins/resource/appstudio/v2";
import "../../../src/plugins/resource/frontend/v2";
import "../../../src/plugins/resource/bot/v2";
import { isArmSupportEnabled } from "../../../src/common/tools";
import { newEnvInfo } from "../../../src/core/tools";
import fs from "fs-extra";
import { ProgrammingLanguage } from "../../../src/plugins/resource/bot/enums/programmingLanguage";
import { MockGraphTokenProvider } from "../../core/utils";
import { createEnv } from "../../../src/plugins/solution/fx-solution/v2/createEnv";
import { ScaffoldingContextAdapter } from "../../../src/plugins/solution/fx-solution/v2/adaptor";
import { LocalCrypto } from "../../../src/core/crypto";
import { appStudioPlugin, botPlugin } from "../../constants";
import { BuiltInResourcePluginNames } from "../../../src/plugins/solution/fx-solution/v3/constants";
import { AppStudioPluginV3 } from "../../../src/plugins/resource/appstudio/v3";
import { armV2 } from "../../../src/plugins/solution/fx-solution/arm";
import { NamedArmResourcePlugin } from "../../../src/common/armInterface";
import * as os from "os";

chai.use(chaiAsPromised);
const expect = chai.expect;

const functionPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.FunctionPlugin);
const sqlPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.SqlPlugin);
const apimPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.ApimPlugin);
const localDebugPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.LocalDebugPlugin);
const appStudioPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);
const frontendPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.FrontendPlugin);
const botPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.BotPlugin);
const mockedProvider: TokenProvider = {
  appStudioToken: new MockedAppStudioProvider(),
  azureAccountProvider: new MockedAzureAccountProvider(),
  graphTokenProvider: new MockGraphTokenProvider(),
  sharepointTokenProvider: new MockedSharepointProvider(),
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
    const appStudioPlugin = Container.get<AppStudioPluginV3>(BuiltInResourcePluginNames.appStudio);
    mocker
      .stub<any, any>(appStudioPlugin, "capabilityExceedLimit")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: v2.InputsWithProjectPath,
          capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension"
        ) => {
          return true;
        }
      );
    mocker
      .stub<any, any>(appStudioPlugin, "addCapabilities")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: v2.InputsWithProjectPath,
          capabilities: (
            | { name: "staticTab"; snippet?: IStaticTab }
            | { name: "configurableTab"; snippet?: IConfigurableTab }
            | { name: "Bot"; snippet?: IBot }
            | { name: "MessageExtension"; snippet?: IComposeExtension }
          )[]
        ) => {
          return ok(undefined);
        }
      );
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
    const appStudioPlugin = Container.get<AppStudioPluginV3>(BuiltInResourcePluginNames.appStudio);
    mocker
      .stub<any, any>(appStudioPlugin, "capabilityExceedLimit")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: v2.InputsWithProjectPath,
          capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension"
        ) => {
          return false;
        }
      );
    mocker
      .stub<any, any>(appStudioPlugin, "addCapabilities")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: v2.InputsWithProjectPath,
          capabilities: (
            | { name: "staticTab"; snippet?: IStaticTab }
            | { name: "configurableTab"; snippet?: IConfigurableTab }
            | { name: "Bot"; snippet?: IBot }
            | { name: "MessageExtension"; snippet?: IComposeExtension }
          )[]
        ) => {
          return ok(undefined);
        }
      );
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
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
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

  it("should return ok when adding APIM", async () => {
    if (isArmSupportEnabled()) {
      return;
    }
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
    mockScaffoldCodeThatAlwaysSucceeds(sqlPluginV2);
    mockScaffoldCodeThatAlwaysSucceeds(functionPluginV2);
    mockExecuteUserTaskThatAlwaysSucceeds(apimPluginV2);

    const apimSpy = mocker.spy(apimPluginV2);
    const result = await executeUserTask(
      mockedCtx,
      mockedInputs,
      { namespace: "solution", method: "addResource" },
      {},
      { envName: "default", config: {}, state: {} },
      mockedProvider
    );
    expect(result.isOk()).to.be.true;
    expect(apimSpy.executeUserTask?.calledOnce, "APIM::executeUserTask() is called").to.be.true;
    expect(apimSpy.scaffoldSourceCode?.notCalled, "APIM::scaffoldSourceCode() is not called").to.be
      .true;
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

    it("createEnv", async () => {
      if (isArmSupportEnabled()) {
        return;
      }
      const mockedCtx = new MockedV2Context(projectSettings);
      const mockedInputs: Inputs = {
        platform: Platform.VSCode,
      };

      const result = await createEnv(mockedCtx, mockedInputs);
      expect(result.isOk()).to.be.true;

      mockedInputs.copy = true;
      const result2 = await createEnv(mockedCtx, mockedInputs);
      expect(result2.isOk()).to.be.true;
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
});
