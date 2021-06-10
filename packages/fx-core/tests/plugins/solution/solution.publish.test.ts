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
import { Solution } from "@azure/arm-appservice/esm/models/mappers";

chai.use(chaiAsPromised);
const expect = chai.expect;

function mockSolutionContext(): SolutionContext {
  const config: SolutionConfig = new Map();
  config.set(GLOBAL_CONFIG, new ConfigMap);
  return {
    root: ".",
    app: new TeamsAppManifest(),
    config,
    answers: new ConfigMap(),
    projectSettings: undefined,
  };
}

function mockPublishThatAlwaysSucceed(plugin: Plugin) {
  plugin.publish = async function (
    _ctx: PluginContext,
  ): Promise<Result<any, FxError>> {
    return ok(Void);
  };
}

describe("publish()", () => {

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
    const result = await solution.publish(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.CannotPublishBeforeProvision);
  });

  it("should return error if a SPFx project hasn't been provisioned", async () => {
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
    const result = await solution.publish(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.CannotPublishBeforeProvision);
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
    const result = await solution.publish(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.FailedToLoadManifestFile);
  });

  describe("with valid manifest", async () => {
    const mocker = sinon.createSandbox();
    const mockedManifest = _.cloneDeep(validManifest);
    // ignore icons for simplicity
    mockedManifest.icons.color = "";
    mockedManifest.icons.outline = "";
    beforeEach(() => {
      mocker.stub<any, any>(fs, "readJson").withArgs(`./.${ConfigFolderName}/${REMOTE_MANIFEST}`).resolves(mockedManifest);
      mocker.stub<any, any>(fs, "readFile").withArgs(`./.${ConfigFolderName}/${REMOTE_MANIFEST}`).resolves(JSON.stringify(mockedManifest));
    });

    afterEach(() => {
      mocker.restore();
    });

    it("should return error if solution status is not idle", async () => {
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
      solution.runningState = SolutionRunningState.ProvisionInProgress;
      mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      let result = await solution.publish(mockedCtx);
      expect(result.isErr()).to.be.true;
      expect(result._unsafeUnwrapErr().name).equals(SolutionError.ProvisionInProgress);

      solution.runningState = SolutionRunningState.DeployInProgress;
      result = await solution.publish(mockedCtx);
      expect(result.isErr()).to.be.true;
      expect(result._unsafeUnwrapErr().name).equals(SolutionError.DeploymentInProgress);
      
      solution.runningState = SolutionRunningState.PublishInProgress;
      result = await solution.publish(mockedCtx);
      expect(result.isErr()).to.be.true;
      expect(result._unsafeUnwrapErr().name).equals(SolutionError.PublishInProgress);
    });

    it("should return ok for SPFx projects on happy path", async () => {
      const solution = new TeamsAppSolution();
      const mockedCtx = mockSolutionContext();
      mockedCtx.projectSettings = {
        appName: "my app",
        solutionSettings: {
          hostType: HostTypeOptionSPFx.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [solution.appStudioPlugin.name, solution.spfxPlugin.name]
        },
      };
      mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      mockPublishThatAlwaysSucceed(solution.appStudioPlugin);
      mockPublishThatAlwaysSucceed(solution.spfxPlugin);
      const result = await solution.publish(mockedCtx);
      expect(result.isOk()).to.be.true;
      // expect(result._unsafeUnwrapErr().name).to.be.true;
    });

  });
});