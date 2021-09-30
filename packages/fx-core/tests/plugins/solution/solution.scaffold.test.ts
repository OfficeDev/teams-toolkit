// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import { TeamsAppSolution } from " ../../../src/plugins/solution";
import {
  FxError,
  ok,
  PluginContext,
  Result,
  SolutionConfig,
  SolutionContext,
  Void,
  Plugin,
  Platform,
  v2,
  Inputs,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import fs, { PathLike } from "fs-extra";
import {
  BotOptionItem,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  MessageExtensionItem,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import _ from "lodash";
import path from "path";
import { createV2Context, getTemplatesFolder, newEnvInfo, newProjectSettings } from "../../../src";
import { validManifest } from "./util";
import * as uuid from "uuid";
import { ResourcePlugins } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import Container from "typedi";
import mockedEnv from "mocked-env";
import { ArmResourcePlugin } from "../../../src/common/armInterface";
import { mockedFehostScaffoldArmResult, mockedSimpleAuthScaffoldArmResult } from "./util";
import { getQuestionsForScaffolding } from "../../../src/plugins/solution/fx-solution/v2/getQuestions";
import { MockTools } from "../../core/utils";
import { assert } from "console";

chai.use(chaiAsPromised);
const expect = chai.expect;
const fehostPlugin = Container.get<Plugin>(ResourcePlugins.FrontendPlugin) as Plugin &
  ArmResourcePlugin;
const simpleAuthPlugin = Container.get<Plugin>(ResourcePlugins.SimpleAuthPlugin) as Plugin &
  ArmResourcePlugin;
const localdebugPlugin = Container.get<Plugin>(ResourcePlugins.LocalDebugPlugin);
const botPlugin = Container.get<Plugin>(ResourcePlugins.BotPlugin);
const spfxPlugin = Container.get<Plugin>(ResourcePlugins.SpfxPlugin);
const appStudioPlugin = Container.get<Plugin>(ResourcePlugins.AppStudioPlugin);
function mockSolutionContext(): SolutionContext {
  const config: SolutionConfig = new Map();
  return {
    root: ".",
    envInfo: newEnvInfo(),
    answers: { platform: Platform.VSCode },
    projectSettings: undefined,
  };
}

function mockScaffoldThatAlwaysSucceed(plugin: Plugin) {
  plugin.preScaffold = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  };
  plugin.scaffold = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  };
  plugin.postScaffold = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  };
}

describe("Solution scaffold() reading valid manifest file", () => {
  const mocker = sinon.createSandbox();
  const fileContent: Map<string, any> = new Map();
  const readmePath = path.join(getTemplatesFolder(), "plugins", "solution", "README.md");
  const mockedReadMeContent = "mocked readme content";

  beforeEach(() => {
    mocker.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
      fileContent.set(path.toString(), data);
    });
    mocker.stub(fs, "writeJSON").callsFake((file: string, obj: any) => {
      fileContent.set(file, JSON.stringify(obj));
    });
    mocker.stub(fs, "readJson").resolves(validManifest);
    mocker.stub<any, any>(fs, "pathExists").withArgs(readmePath).resolves(true);
    mocker.stub(fs, "copy").callsFake((src: string, dest: string) => {
      fileContent.set(dest, mockedReadMeContent);
    });
  });

  afterEach(() => {
    mocker.restore();
  });

  it("should work for happy path with only tab", async () => {
    fileContent.clear();
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
        capabilities: [TabOptionItem.id],
        azureResources: [],
      },
    };
    mockScaffoldThatAlwaysSucceed(fehostPlugin);
    mockScaffoldThatAlwaysSucceed(localdebugPlugin);
    const result = await solution.scaffold(mockedCtx);
    expect(result.isOk()).to.be.true;
  });

  it("should work and generate README.md for happy path with tab and bot", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [fehostPlugin.name, botPlugin.name],
        capabilities: [TabOptionItem.id, BotOptionItem.id],
        azureResources: [],
      },
    };
    mockScaffoldThatAlwaysSucceed(fehostPlugin);
    mockScaffoldThatAlwaysSucceed(botPlugin);
    mockScaffoldThatAlwaysSucceed(localdebugPlugin);
    const result = await solution.scaffold(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(fileContent.get(`${mockedCtx.root}/README.md`)).equals(mockedReadMeContent);
  });

  it("should work and generate README.md for happy path with tab and msgext", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [fehostPlugin.name, botPlugin.name],
        capabilities: [TabOptionItem.id, MessageExtensionItem.id],
        azureResources: [],
      },
    };
    mockScaffoldThatAlwaysSucceed(fehostPlugin);
    mockScaffoldThatAlwaysSucceed(botPlugin);
    mockScaffoldThatAlwaysSucceed(localdebugPlugin);
    const result = await solution.scaffold(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(fileContent.get(`${mockedCtx.root}/README.md`)).equals(mockedReadMeContent);
  });

  it("should work and generate arm template when project requires Azure services", async () => {
    // add dedicated test case to test ARM feature enabled behavior
    const restore = mockedEnv({
      TEAMSFX_INSIDER_PREVIEW: "1",
    });

    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [simpleAuthPlugin.name],
        capabilities: [TabOptionItem.id],
        azureResources: [],
      },
    };
    mockScaffoldThatAlwaysSucceed(fehostPlugin);
    mockScaffoldThatAlwaysSucceed(simpleAuthPlugin);
    mockScaffoldThatAlwaysSucceed(localdebugPlugin);
    mockScaffoldThatAlwaysSucceed(appStudioPlugin);

    // mock plugin behavior
    mocker.stub(fehostPlugin, "generateArmTemplates").callsFake(async (ctx: PluginContext) => {
      return ok(mockedFehostScaffoldArmResult);
    });

    mocker.stub(simpleAuthPlugin, "generateArmTemplates").callsFake(async (ctx: PluginContext) => {
      return ok(mockedSimpleAuthScaffoldArmResult);
    });

    const result = await solution.scaffold(mockedCtx);
    expect(result.isOk()).to.be.true;
    // only need to check whether related files exist, tests to the content is covered by other test cases
    expect(fileContent.size).equals(5);
    expect(fileContent.has(path.join("./templates/azure", "main.bicep"))).to.be.true;
    expect(
      fileContent.has(path.join("./templates/azure/modules", "frontendHostingProvision.bicep"))
    ).to.be.true;
    expect(fileContent.has(path.join("./templates/azure/modules", "simpleAuthProvision.bicep"))).to
      .be.true;
    expect(fileContent.has(path.join("./.fx/configs", "azure.parameters.default.json"))).to.be.true;

    restore();
  });

  it("should work and not generate arm template when project does not require Azure services", async () => {
    // add dedicated test case to test ARM feature enabled behavior
    const restore = mockedEnv({
      TEAMSFX_INSIDER_PREVIEW: "1",
    });

    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "spfx",
        version: "1.0",
        activeResourcePlugins: [spfxPlugin.name],
        capabilities: [TabOptionItem.id],
        azureResources: [],
      },
    };
    mockScaffoldThatAlwaysSucceed(spfxPlugin);
    mockScaffoldThatAlwaysSucceed(localdebugPlugin);
    mockScaffoldThatAlwaysSucceed(appStudioPlugin);

    const result = await solution.scaffold(mockedCtx);
    expect(result.isOk()).to.be.true;
    // only need to check whether related files exist, tests to the content is covered by other test cases
    expect(fileContent.size).equals(0);

    restore();
  });
  it("getQuestionsForScaffolding", async () => {
    const tools = new MockTools();
    const contextv2: v2.Context = {
      userInteraction: tools.ui,
      logProvider: tools.logProvider,
      telemetryReporter: tools.telemetryReporter!,
      cryptoProvider: tools.cryptoProvider!,
      permissionRequestProvider: tools.permissionRequestProvider!,
      projectSetting: newProjectSettings(),
    };
    const inputs: Inputs = { platform: Platform.CLI, projectPath: "." };
    const res = await getQuestionsForScaffolding(contextv2, inputs);
    assert(res.isOk());
  });
});
