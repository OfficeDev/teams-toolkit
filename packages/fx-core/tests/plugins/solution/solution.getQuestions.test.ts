// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ConfigMap, Inputs, ok, Platform, ProjectSettings, SolutionConfig,
  SolutionContext, Stage,
  TokenProvider, v2
} from "@microsoft/teamsfx-api";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import * as sinon from "sinon";
import Container from "typedi";
import * as uuid from "uuid";
import { newEnvInfo } from "../../../src";
import "../../../src/plugins/resource/apim/v2";
import "../../../src/plugins/resource/appstudio/v2";
import "../../../src/plugins/resource/bot/v2";
import "../../../src/plugins/resource/frontend/v2";
import "../../../src/plugins/resource/function/v2";
import "../../../src/plugins/resource/localdebug/v2";
import "../../../src/plugins/resource/spfx/v2";
import "../../../src/plugins/resource/sql/v2";
import { GLOBAL_CONFIG } from "../../../src/plugins/solution/fx-solution/constants";
import {
  HostTypeOptionAzure
} from "../../../src/plugins/solution/fx-solution/question";
import {
  ResourcePluginsV2
} from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import { getQuestions, getQuestionsForScaffolding } from "../../../src/plugins/solution/fx-solution/v2/getQuestions";
import { MockGraphTokenProvider } from "../../core/utils";
import {
  MockedAppStudioProvider, MockedAzureAccountProvider, MockedV2Context
} from "./util";

chai.use(chaiAsPromised);
const expect = chai.expect;
const functionPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.FunctionPlugin);
const sqlPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.SqlPlugin);
const apimPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.ApimPlugin);
const spfxPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.SpfxPlugin);

const localDebugPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.LocalDebugPlugin);
const appStudioPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);
const frontendPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.FrontendPlugin);
const botPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.BotPlugin);
const mockedProvider: TokenProvider = {
  appStudioToken: new MockedAppStudioProvider(),
  azureAccountProvider: new MockedAzureAccountProvider(),
  graphTokenProvider: new MockGraphTokenProvider(),
};
const envInfo = {envName: "default", config: {}, profile:{}};
function mockSolutionContextWithPlatform(platform?: Platform): SolutionContext {
  const config: SolutionConfig = new Map();
  config.set(GLOBAL_CONFIG, new ConfigMap());
  return {
    root: ".",
    envInfo: newEnvInfo(),
    answers: { platform: platform ? platform : Platform.VSCode },
    projectSettings: undefined,
  };
}

describe("getQuestionsForScaffolding()", async () => {
  const mocker = sinon.createSandbox();
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

  afterEach(() => {});

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
      stage: Stage.migrateV1
    };
    const result = await getQuestions(mockedCtx, mockedInputs, envInfo,mockedProvider);
    expect(result.isOk() && result.value.data).to.be.true;
  });
});
