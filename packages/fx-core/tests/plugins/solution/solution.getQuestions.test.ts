// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureSolutionSettings,
  Func,
  Inputs,
  MultiSelectQuestion,
  ok,
  OptionItem,
  Platform,
  ProjectSettings,
  Stage,
  TokenProvider,
  v2,
} from "@microsoft/teamsfx-api";
import { EnvInfoV2 } from "@microsoft/teamsfx-api/build/v2";
import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import * as sinon from "sinon";
import Container from "typedi";
import * as uuid from "uuid";
import "../../../src/plugins/resource/apim/v2";
import "../../../src/plugins/resource/appstudio/v2";
import { AppStudioPluginV3 } from "../../../src/plugins/resource/appstudio/v3";
import "../../../src/plugins/resource/bot/v2";
import "../../../src/plugins/resource/frontend/v2";
import "../../../src/plugins/resource/function/v2";
import "../../../src/plugins/resource/localdebug/v2";
import "../../../src/plugins/resource/spfx/v2";
import "../../../src/plugins/resource/sql/v2";
import {
  GLOBAL_CONFIG,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../../../src/plugins/solution/fx-solution/constants";
import {
  BotOptionItem,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  MessageExtensionItem,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import { ResourcePluginsV2 } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import {
  getQuestions,
  getQuestionsForScaffolding,
  getQuestionsForUserTask,
} from "../../../src/plugins/solution/fx-solution/v2/getQuestions";
import { BuiltInResourcePluginNames } from "../../../src/plugins/solution/fx-solution/v3/constants";
import { MockGraphTokenProvider, MockSharepointTokenProvider } from "../../core/utils";
import { MockedAppStudioProvider, MockedAzureAccountProvider, MockedV2Context } from "./util";

chai.use(chaiAsPromised);
const expect = chai.expect;
const functionPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.FunctionPlugin);
const sqlPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.SqlPlugin);
const spfxPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.SpfxPlugin);
const frontendPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.FrontendPlugin);
const botPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.BotPlugin);
const mockedProvider: TokenProvider = {
  appStudioToken: new MockedAppStudioProvider(),
  azureAccountProvider: new MockedAzureAccountProvider(),
  graphTokenProvider: new MockGraphTokenProvider(),
  sharepointTokenProvider: new MockSharepointTokenProvider(),
};
const envInfo: EnvInfoV2 = {
  envName: "default",
  config: {},
  state: { solution: { output: {}, secrets: {} } },
};

describe("getQuestionsForScaffolding()", async () => {
  const sandbox = sinon.createSandbox();
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

  beforeEach(() => {
    spfxPluginV2.getQuestionsForScaffolding = async function () {
      return ok(undefined);
    };
    frontendPluginV2.getQuestionsForScaffolding = async function () {
      return ok(undefined);
    };
    functionPluginV2.getQuestionsForScaffolding = async function () {
      return ok(undefined);
    };
    sqlPluginV2.getQuestionsForScaffolding = async function () {
      return ok(undefined);
    };
    botPluginV2.getQuestionsForScaffolding = async function () {
      return ok(undefined);
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("getQuestionsForScaffolding", async () => {
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
    };
    const result = await getQuestionsForScaffolding(mockedCtx, mockedInputs);
    expect(result.isOk()).to.be.true;
  });

  it("getQuestions - migrateV1", async () => {
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      stage: Stage.migrateV1,
    };
    const result = await getQuestions(mockedCtx, mockedInputs, envInfo, mockedProvider);
    assert.isTrue(result.isOk());
    if (result.isOk()) {
      const node = result.value;
      assert.isTrue(node !== undefined && node.data !== undefined);
    }
  });

  it("getQuestions - provision", async () => {
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      stage: Stage.provision,
    };
    const result = await getQuestions(mockedCtx, mockedInputs, envInfo, mockedProvider);
    assert.isTrue(result.isOk());
    if (result.isOk()) {
      const node = result.value;
      assert.isTrue(node !== undefined && node.data !== undefined);
    }
  });

  it("getQuestions - deploy", async () => {
    (projectSettings.solutionSettings as AzureSolutionSettings).capabilities.push(TabOptionItem.id);
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      stage: Stage.deploy,
    };
    envInfo.state[GLOBAL_CONFIG]["output"][SOLUTION_PROVISION_SUCCEEDED] = false;
    const result1 = await getQuestions(mockedCtx, mockedInputs, envInfo, mockedProvider);
    assert.isTrue(result1.isErr());
    envInfo.state[GLOBAL_CONFIG]["output"][SOLUTION_PROVISION_SUCCEEDED] = true;
    const result2 = await getQuestions(mockedCtx, mockedInputs, envInfo, mockedProvider);
    assert.isTrue(result2.isOk());
    if (result2.isOk()) {
      const node = result2.value;
      assert.isTrue(node !== undefined && node.data !== undefined);
    }
  });

  it("getQuestions - publish", async () => {
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      stage: Stage.publish,
    };
    envInfo.state[GLOBAL_CONFIG]["output"][SOLUTION_PROVISION_SUCCEEDED] = false;
    const result1 = await getQuestions(mockedCtx, mockedInputs, envInfo, mockedProvider);
    assert.isTrue(result1.isErr());

    (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).hostType =
      HostTypeOptionSPFx.id;
    const result11 = await getQuestions(mockedCtx, mockedInputs, envInfo, mockedProvider);
    assert.isTrue(result11.isErr());

    envInfo.state[GLOBAL_CONFIG]["output"][SOLUTION_PROVISION_SUCCEEDED] = true;
    const result2 = await getQuestions(mockedCtx, mockedInputs, envInfo, mockedProvider);
    assert.isTrue(result2.isOk());
    if (result2.isOk()) {
      const node = result2.value;
      assert.isTrue(node !== undefined && node.data !== undefined);
    }
  });

  it("getQuestions - grantPermission", async () => {
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      stage: Stage.grantPermission,
    };
    const result2 = await getQuestions(mockedCtx, mockedInputs, envInfo, mockedProvider);
    assert.isTrue(result2.isOk());
    if (result2.isOk()) {
      const node = result2.value;
      assert.isTrue(node !== undefined && node.data !== undefined);
    }
  });
  it("getQuestionsForUserTask - addCapability for SPFx failed", async () => {
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      stage: Stage.grantPermission,
    };
    const func: Func = {
      method: "addCapability",
      namespace: "fx-solution-azure",
    };
    {
      (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).hostType =
        HostTypeOptionSPFx.id;
      const res = await getQuestionsForUserTask(
        mockedCtx,
        mockedInputs,
        func,
        envInfo,
        mockedProvider
      );
      assert.isTrue(res.isErr());
    }
  });

  it("getQuestionsForUserTask - addCapability success", async () => {
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      stage: Stage.grantPermission,
    };
    const func: Func = {
      method: "addCapability",
      namespace: "fx-solution-azure",
    };
    const appStudioPlugin = Container.get<AppStudioPluginV3>(BuiltInResourcePluginNames.appStudio);
    sandbox
      .stub<any, any>(appStudioPlugin, "capabilityExceedLimit")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: v2.InputsWithProjectPath,
          capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension"
        ) => {
          return ok(false);
        }
      );
    (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).hostType =
      HostTypeOptionAzure.id;
    const res = await getQuestionsForUserTask(
      mockedCtx,
      mockedInputs,
      func,
      envInfo,
      mockedProvider
    );
    assert.isTrue(res.isOk() && res.value && res.value.data !== undefined);
    if (res.isOk()) {
      const node = res.value;
      assert.isTrue(
        node &&
          node.data &&
          node.data.type === "multiSelect" &&
          node.data.staticOptions.length === 3
      );
      if (node && node.data && node.data.type === "multiSelect") {
        assert.deepEqual((node.data as MultiSelectQuestion).staticOptions as OptionItem[], [
          TabOptionItem,
          BotOptionItem,
          MessageExtensionItem,
        ]);
      }
    }
  });
  it("getQuestionsForUserTask - addCapability failed because of capabilityExceedLimit", async () => {
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      stage: Stage.grantPermission,
    };
    const func: Func = {
      method: "addCapability",
      namespace: "fx-solution-azure",
    };
    const appStudioPlugin = Container.get<AppStudioPluginV3>(BuiltInResourcePluginNames.appStudio);
    sandbox
      .stub<any, any>(appStudioPlugin, "capabilityExceedLimit")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: v2.InputsWithProjectPath,
          capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension"
        ) => {
          return ok(true);
        }
      );
    (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).hostType =
      HostTypeOptionAzure.id;
    const res = await getQuestionsForUserTask(
      mockedCtx,
      mockedInputs,
      func,
      envInfo,
      mockedProvider
    );
    assert.isTrue(res.isOk() && res.value === undefined);
  });

  it("getQuestionsForUserTask - addResource", async () => {
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      stage: Stage.grantPermission,
    };
    const func: Func = {
      method: "addResource",
      namespace: "fx-solution-azure",
    };
    {
      (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).hostType =
        HostTypeOptionSPFx.id;
      const res = await getQuestionsForUserTask(
        mockedCtx,
        mockedInputs,
        func,
        envInfo,
        mockedProvider
      );
      assert.isTrue(res.isErr());
    }
    {
      (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).hostType =
        HostTypeOptionAzure.id;
      const res = await getQuestionsForUserTask(
        mockedCtx,
        mockedInputs,
        func,
        envInfo,
        mockedProvider
      );
      assert.isTrue(res.isOk());
    }
    {
      (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).hostType =
        HostTypeOptionAzure.id;
      (mockedCtx.projectSetting.solutionSettings as AzureSolutionSettings).capabilities = [
        TabOptionItem.id,
      ];
      const res = await getQuestionsForUserTask(
        mockedCtx,
        mockedInputs,
        func,
        envInfo,
        mockedProvider
      );
      assert.isTrue(res.isOk());
      if (res.isOk()) {
        const node = res.value;
        assert.isTrue(node !== undefined && node.data !== undefined);
      }
    }
  });
});
