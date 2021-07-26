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
  BOT_DOMAIN,
  GLOBAL_CONFIG,
  REMOTE_AAD_ID,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
  WEB_APPLICATION_INFO_SOURCE,
} from "../../../src/plugins/solution/fx-solution/constants";
import {
  BOT_ID,
  FRONTEND_DOMAIN,
  FRONTEND_ENDPOINT,
  REMOTE_MANIFEST,
} from "../../../src/plugins/resource/appstudio/constants";
import {
  BotOptionItem,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import { mockPublishThatAlwaysSucceed, validManifest } from "./util";
import _ from "lodash";
import * as uuid from "uuid";
import { ResourcePlugins } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import Container from "typedi";

chai.use(chaiAsPromised);
const expect = chai.expect;
const aadPlugin = Container.get<Plugin>(ResourcePlugins.AadPlugin);
const spfxPlugin = Container.get<Plugin>(ResourcePlugins.SpfxPlugin);
const fehostPlugin = Container.get<Plugin>(ResourcePlugins.FrontendPlugin);
const appStudioPlugin = Container.get<Plugin>(ResourcePlugins.AppStudioPlugin);
const botPlugin = Container.get<Plugin>(ResourcePlugins.BotPlugin);
function mockSolutionContext(): SolutionContext {
  const config: SolutionConfig = new Map();
  config.set(GLOBAL_CONFIG, new ConfigMap());
  return {
    root: ".",
    // app: new TeamsAppManifest(),
    config,
    answers: { platform: Platform.VSCode },
    projectSettings: undefined,
  };
}

describe("publish()", () => {
  it("should return error if an Azure project hasn't been provisioned", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [aadPlugin.name],
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
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [spfxPlugin.name],
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
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [aadPlugin.name],
      },
    };
    mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
    const result = await solution.publish(mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals("ManifestLoadFailed");
  });

  describe("with valid manifest", async () => {
    const mocker = sinon.createSandbox();
    const mockedManifest = _.cloneDeep(validManifest);
    // ignore icons for simplicity
    mockedManifest.icons.color = "";
    mockedManifest.icons.outline = "";
    beforeEach(() => {
      mocker
        .stub<any, any>(fs, "readJson")
        .withArgs(`./.${ConfigFolderName}/${REMOTE_MANIFEST}`)
        .resolves(mockedManifest);
      mocker
        .stub<any, any>(fs, "readFile")
        .withArgs(`./.${ConfigFolderName}/${REMOTE_MANIFEST}`)
        .resolves(JSON.stringify(mockedManifest));
    });

    afterEach(() => {
      mocker.restore();
    });

    it("should return error if solution status is not idle", async () => {
      const solution = new TeamsAppSolution();
      const mockedCtx = mockSolutionContext();
      mockedCtx.projectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [aadPlugin.name],
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
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionSPFx.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [appStudioPlugin.name, spfxPlugin.name],
        },
      };
      mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      mockPublishThatAlwaysSucceed(appStudioPlugin);
      mockPublishThatAlwaysSucceed(spfxPlugin);
      const result = await solution.publish(mockedCtx);
      expect(result.isOk()).to.be.true;
    });

    it("should return ok for Azure Tab projects on happy path", async () => {
      const solution = new TeamsAppSolution();
      const mockedCtx = mockSolutionContext();
      mockedCtx.config.set(aadPlugin.name, new ConfigMap());
      mockedCtx.config.set(fehostPlugin.name, new ConfigMap());
      mockedCtx.config.set(appStudioPlugin.name, new ConfigMap());
      mockedCtx.projectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [aadPlugin.name, fehostPlugin.name],
          capabilities: [TabOptionItem.id],
        },
      };
      mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      mockedCtx.config.get(fehostPlugin.name)?.set(FRONTEND_ENDPOINT, "http://example.com");
      mockedCtx.config.get(fehostPlugin.name)?.set(FRONTEND_DOMAIN, "http://example.com");
      mockedCtx.config
        .get(aadPlugin.name)
        ?.set(WEB_APPLICATION_INFO_SOURCE, "mockedWebApplicationInfoResouce");
      mockedCtx.config.get(aadPlugin.name)?.set(REMOTE_AAD_ID, "mockedRemoteAadId");
      mockPublishThatAlwaysSucceed(appStudioPlugin);
      const result = await solution.publish(mockedCtx);
      expect(result.isOk()).to.be.true;
    });

    it("should return ok for Azure Bot projects on happy path", async () => {
      const solution = new TeamsAppSolution();
      const mockedCtx = mockSolutionContext();
      mockedCtx.config.set(aadPlugin.name, new ConfigMap());
      mockedCtx.config.set(botPlugin.name, new ConfigMap());
      mockedCtx.config.set(appStudioPlugin.name, new ConfigMap());
      mockedCtx.projectSettings = {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          hostType: HostTypeOptionAzure.id,
          name: "azure",
          version: "1.0",
          activeResourcePlugins: [aadPlugin.name, botPlugin.name],
          capabilities: [BotOptionItem.id],
        },
      };
      mockedCtx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      mockedCtx.config.get(botPlugin.name)?.set(BOT_ID, "someFakeId");
      mockedCtx.config.get(botPlugin.name)?.set(BOT_DOMAIN, "http://example.com");
      mockedCtx.config
        .get(aadPlugin.name)
        ?.set(WEB_APPLICATION_INFO_SOURCE, "mockedWebApplicationInfoResouce");
      mockedCtx.config.get(aadPlugin.name)?.set(REMOTE_AAD_ID, "mockedRemoteAadId");
      mockPublishThatAlwaysSucceed(appStudioPlugin);
      const result = await solution.publish(mockedCtx);
      expect(result.isOk()).to.be.true;
    });
  });
});
