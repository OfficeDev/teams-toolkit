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
  BOT_DOMAIN,
  BOT_ID,
  FRONTEND_DOMAIN,
  FRONTEND_ENDPOINT,
  GLOBAL_CONFIG,
  REMOTE_AAD_ID,
  REMOTE_MANIFEST,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
  WEB_APPLICATION_INFO_SOURCE,
} from "../../../src/plugins/solution/fx-solution/constants";
import {
  BotOptionItem,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import { mockPublishThatAlwaysSucceed, validManifest } from "./util";
import _ from "lodash";

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
    });

    it("should return ok for Azure Tab projects on happy path", async () => {
      const solution = new TeamsAppSolution();
      const mockedCtx = mockSolutionContext();
      mockedCtx.config.set(solution.aadPlugin.name, new ConfigMap);
      mockedCtx.config.set(solution.fehostPlugin.name, new ConfigMap);
      mockedCtx.config.set(solution.appStudioPlugin.name, new ConfigMap);
      mockedCtx.projectSettings = {
        appName: "my app",
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [solution.aadPlugin.name, solution.fehostPlugin.name],
          capabilities: [TabOptionItem.id]
        },
      };
      mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      mockedCtx.config.get(solution.fehostPlugin.name)?.set(FRONTEND_ENDPOINT, "http://example.com");
      mockedCtx.config.get(solution.fehostPlugin.name)?.set(FRONTEND_DOMAIN, "http://example.com");
      mockedCtx.config.get(solution.aadPlugin.name)?.set(WEB_APPLICATION_INFO_SOURCE, "mockedWebApplicationInfoResouce");
      mockedCtx.config.get(solution.aadPlugin.name)?.set(REMOTE_AAD_ID, "mockedRemoteAadId");
      mockPublishThatAlwaysSucceed(solution.appStudioPlugin);
      const result = await solution.publish(mockedCtx);
      expect(result.isOk()).to.be.true;
    });

    it("should return ok for Azure Bot projects on happy path", async () => {
      const solution = new TeamsAppSolution();
      const mockedCtx = mockSolutionContext();
      mockedCtx.config.set(solution.aadPlugin.name, new ConfigMap);
      mockedCtx.config.set(solution.botPlugin.name, new ConfigMap);
      mockedCtx.config.set(solution.appStudioPlugin.name, new ConfigMap);
      mockedCtx.projectSettings = {
        appName: "my app",
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [solution.aadPlugin.name, solution.botPlugin.name],
          capabilities: [BotOptionItem.id]
        },
      };
      mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      mockedCtx.config.get(solution.botPlugin.name)?.set(BOT_ID, "someFakeId");
      mockedCtx.config.get(solution.botPlugin.name)?.set(BOT_DOMAIN, "http://example.com");
      mockedCtx.config.get(solution.aadPlugin.name)?.set(WEB_APPLICATION_INFO_SOURCE, "mockedWebApplicationInfoResouce");
      mockedCtx.config.get(solution.aadPlugin.name)?.set(REMOTE_AAD_ID, "mockedRemoteAadId");
      mockPublishThatAlwaysSucceed(solution.appStudioPlugin);
      const result = await solution.publish(mockedCtx);
      expect(result.isOk()).to.be.true;
    });
  });
});