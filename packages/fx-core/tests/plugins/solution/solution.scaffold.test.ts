// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import { TeamsAppSolution } from " ../../../src/plugins/solution";
import {
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
  Platform,
  v2,
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
import { getTemplatesFolder } from "../../../src";
import { validManifest } from "./util";
import * as uuid from "uuid";
import { ResourcePlugins } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import Container from "typedi";
import mockedEnv from "mocked-env";
import { ArmResourcePlugin } from "../../../src/common/armInterface";
import { mockedFehostScaffoldArmResult, mockedSimpleAuthScaffoldArmResult } from "./util";

chai.use(chaiAsPromised);
const expect = chai.expect;
const fehostPlugin = Container.get<Plugin>(ResourcePlugins.FrontendPlugin) as Plugin &
  ArmResourcePlugin;
const simpleAuthPlugin = Container.get<Plugin>(ResourcePlugins.SimpleAuthPlugin) as Plugin &
  ArmResourcePlugin;
const localdebugPlugin = Container.get<Plugin>(ResourcePlugins.LocalDebugPlugin);
const botPlugin = Container.get<Plugin>(ResourcePlugins.BotPlugin);
const spfxPlugin = Container.get<Plugin>(ResourcePlugins.SpfxPlugin);
function mockSolutionContext(): SolutionContext {
  const config: SolutionConfig = new Map();
  return {
    root: ".",
    config,
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
      TEAMSFX_ARM_SUPPORT: "1",
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
      },
    };
    mockScaffoldThatAlwaysSucceed(fehostPlugin);
    mockScaffoldThatAlwaysSucceed(simpleAuthPlugin);
    mockScaffoldThatAlwaysSucceed(localdebugPlugin);

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
    expect(fileContent.size).equals(5); // there's a readme file
    expect(fileContent.has(path.join("./infra/azure/templates", "main.bicep"))).to.be.true;
    expect(fileContent.has(path.join("./infra/azure/templates", "frontendHostingProvision.bicep")))
      .to.be.true;
    expect(fileContent.has(path.join("./infra/azure/templates", "simpleAuthProvision.bicep"))).to.be
      .true;
    expect(fileContent.has(path.join("./infra/azure/parameters", "parameters.template.json"))).to.be
      .true;

    restore();
  });

  it("should work and not generate arm template when project does not require Azure services", async () => {
    // add dedicated test case to test ARM feature enabled behavior
    const restore = mockedEnv({
      TEAMSFX_ARM_SUPPORT: "1",
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
      },
    };
    mockScaffoldThatAlwaysSucceed(spfxPlugin);
    mockScaffoldThatAlwaysSucceed(localdebugPlugin);

    const result = await solution.scaffold(mockedCtx);
    expect(result.isOk()).to.be.true;
    // only need to check whether related files exist, tests to the content is covered by other test cases
    expect(fileContent.size).equals(1); // only a readme file is generated

    restore();
  });
});
