// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import { SolutionRunningState, TeamsAppSolution } from " ../../../src/plugins/solution";
import {
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
  Platform,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import fs from "fs-extra";
import {
  GLOBAL_CONFIG,
  REMOTE_MANIFEST,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../../../src/plugins/solution/fx-solution/constants";
import {
  AzureSolutionQuestionNames,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
} from "../../../src/plugins/solution/fx-solution/question";
import { validManifest } from "./util";
import _ from "lodash";

chai.use(chaiAsPromised);
const expect = chai.expect;

function mockSolutionContext(): SolutionContext {
  const config: SolutionConfig = new Map();
  config.set(GLOBAL_CONFIG, new ConfigMap);
  return {
    root: ".",
    // app: new TeamsAppManifest(),
    config,
    answers: {platform:Platform.VSCode},
    projectSettings: undefined,
  };
}

function mockDeployThatAlwaysSucceed(plugin: Plugin) {
  plugin.preDeploy = async function (
    _ctx: PluginContext,
  ): Promise<Result<any, FxError>> {
    return ok(Void);
  };
  plugin.deploy = async function (
    _ctx: PluginContext,
  ): Promise<Result<any, FxError>> {
    return ok(Void);
  };
  plugin.postDeploy = async function (
    _ctx: PluginContext,
  ): Promise<Result<any, FxError>> {
    return ok(Void);
  };
}

describe("deploy() for Azure projects", () => {
  it("should return error if an Azure project hasn't been provisioned", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [solution.aadPlugin.name]
      },
    };
    const result = await solution.deploy(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.CannotDeployBeforeProvision);
  });

  it("should return error if manifest file is not found", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [solution.aadPlugin.name]
      },
    };
    mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
    const result = await solution.deploy(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.FailedToLoadManifestFile);
  });

  describe("with valid manifest", () => {
    const mocker = sinon.createSandbox();
    const mockedManifest = _.cloneDeep(validManifest);
    // ignore icons for simplicity
    mockedManifest.icons.color = "";
    mockedManifest.icons.outline = "";
    beforeEach(() => {
      mocker.stub<any, any>(fs, "readJson").withArgs(`./.${ConfigFolderName}/${REMOTE_MANIFEST}`).resolves(mockedManifest);
    });

    afterEach(() => {
      mocker.restore();
    });

    it("should return error if no resource is selected to deploy", async () => {
      const solution = new TeamsAppSolution();
      const mockedCtx = mockSolutionContext();
      mockedCtx.projectSettings = {
        appName: "my app",
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [solution.aadPlugin.name]
        },
      };
      mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      const result = await solution.deploy(mockedCtx);
      expect(result.isErr()).to.be.true;
      expect(result._unsafeUnwrapErr().name).equals(SolutionError.NoResourcePluginSelected);
    });

    it("should return ok on happy path and set solution status to idle", async () => {
      const solution = new TeamsAppSolution();
      const mockedCtx = mockSolutionContext();
      mockedCtx.projectSettings = {
        appName: "my app",
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [solution.aadPlugin.name]
        },
      };
      mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      mockedCtx.answers![AzureSolutionQuestionNames.PluginSelectionDeploy] = [solution.fehostPlugin.name];
      mockDeployThatAlwaysSucceed(solution.fehostPlugin);
      
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
      mocker.stub<any, any>(fs, "readJson").withArgs(`./.${ConfigFolderName}/${REMOTE_MANIFEST}`).resolves(mockedManifest);
    });

    afterEach(() => {
      mocker.restore();
    });

    it("doesn't require provision first and should return error if no resource is selected to deploy", async () => {
      const solution = new TeamsAppSolution();
      const mockedCtx = mockSolutionContext();
      mockedCtx.projectSettings = {
        appName: "my app",
        solutionSettings: {
          hostType: HostTypeOptionSPFx.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [solution.spfxPlugin.name]
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
        solutionSettings: {
          hostType: HostTypeOptionSPFx.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [solution.spfxPlugin.name]
        },
      };
      mockedCtx.answers![AzureSolutionQuestionNames.PluginSelectionDeploy] = [solution.fehostPlugin.name];
      mockDeployThatAlwaysSucceed(solution.fehostPlugin);
      
      const result = await solution.deploy(mockedCtx);
      expect(result.isOk()).to.be.true;
      expect(solution.runningState).equals(SolutionRunningState.Idle);
    });
});