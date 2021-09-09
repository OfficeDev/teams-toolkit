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
  Plugin,
  ok,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import { GLOBAL_CONFIG, SolutionError } from "../../../src/plugins/solution/fx-solution/constants";
import {
  MockedAppStudioProvider,
  MockedV2Context,
  mockPublishThatAlwaysSucceed,
  mockV2PublishThatAlwaysSucceed,
  mockScaffoldCodeThatAlwaysSucceeds,
} from "./util";
import _ from "lodash";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import Container from "typedi";
import * as uuid from "uuid";
import {
  AzureResourceSQL,
  AzureSolutionQuestionNames,
  BotOptionItem,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import { getQuestionsForScaffolding } from "../../../src/plugins/solution/fx-solution/v2/getQuestions";
import "../../../src/plugins/resource/function/v2";
import "../../../src/plugins/resource/sql/v2";
import "../../../src/plugins/resource/apim/v2";
import "../../../src/plugins/resource/localdebug/v2";
import "../../../src/plugins/resource/appstudio/v2";
import "../../../src/plugins/resource/frontend/v2";
import "../../../src/plugins/resource/bot/v2";
import "../../../src/plugins/resource/spfx/v2";
import { AppStudioPlugin, newEnvInfo } from "../../../src";
import fs from "fs-extra";
import { ProgrammingLanguage } from "../../../src/plugins/resource/bot/enums/programmingLanguage";
import { getQuestionsForScaffoldingAdapter } from "../../../src/plugins/resource/utils4v2";

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

  it("should contain capability questions", async () => {
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
    };

    const result = await getQuestionsForScaffolding(mockedCtx, mockedInputs);
    expect(result.isOk()).to.be.true;
  });
});
