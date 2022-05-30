// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import { TeamsAppSolution } from " ../../../src/plugins/solution";
import {
  ConfigFolderName,
  ConfigMap,
  SolutionContext,
  Platform,
  v2,
  ProjectSettings,
  Inputs,
  ok,
  Void,
  M365TokenProvider,
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
import {
  MockedM365Provider,
  MockedV2Context,
  mockPublishThatAlwaysSucceed,
  validManifest,
} from "./util";
import _ from "lodash";
import * as uuid from "uuid";
import { ResourcePluginsV2 } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import Container from "typedi";
import { newEnvInfo } from "../../../src";
import { TeamsAppSolutionV2 } from "../../../src/plugins/solution/fx-solution/v2/solution";
import { LocalCrypto } from "../../../src/core/crypto";
import { aadPlugin, botPlugin, fehostPlugin, spfxPlugin, appStudioPlugin } from "../../constants";
import { SolutionRunningState } from "../../../src/plugins/solution/fx-solution/types";

chai.use(chaiAsPromised);
const expect = chai.expect;

const aadPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AadPlugin);
const spfxPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.SpfxPlugin);
const fehostPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.FrontendPlugin);
const appStudioPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);
const botPluginV2 = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.BotPlugin);

function mockSolutionContext(): SolutionContext {
  return {
    root: ".",
    envInfo: newEnvInfo(),
    answers: { platform: Platform.VSCode },
    projectSettings: undefined,
    cryptoProvider: new LocalCrypto(""),
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
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
    const result = await solution.publish(mockedCtx);
    expect(result.isErr()).to.be.true;
    // expect(result._unsafeUnwrapErr().name).equals("ManifestLoadFailed");
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
      mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
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
      mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      mockPublishThatAlwaysSucceed(appStudioPlugin);
      mockPublishThatAlwaysSucceed(spfxPlugin);
      const result = await solution.publish(mockedCtx);
      expect(result.isOk()).to.be.true;
    });

    it("should return ok for Azure Tab projects on happy path", async () => {
      const solution = new TeamsAppSolution();
      const mockedCtx = mockSolutionContext();
      mockedCtx.envInfo.state.set(aadPlugin.name, new ConfigMap());
      mockedCtx.envInfo.state.set(fehostPlugin.name, new ConfigMap());
      mockedCtx.envInfo.state.set(appStudioPlugin.name, new ConfigMap());
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
      mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      mockedCtx.envInfo.state.get(fehostPlugin.name)?.set(FRONTEND_ENDPOINT, "http://example.com");
      mockedCtx.envInfo.state.get(fehostPlugin.name)?.set(FRONTEND_DOMAIN, "http://example.com");
      mockedCtx.envInfo.state
        .get(aadPlugin.name)
        ?.set(WEB_APPLICATION_INFO_SOURCE, "mockedWebApplicationInfoResouce");
      mockedCtx.envInfo.state.get(aadPlugin.name)?.set(REMOTE_AAD_ID, "mockedRemoteAadId");
      mockPublishThatAlwaysSucceed(appStudioPlugin);
      const result = await solution.publish(mockedCtx);
      expect(result.isOk()).to.be.true;
    });

    it("should return ok for Azure Bot projects on happy path", async () => {
      const solution = new TeamsAppSolution();
      const mockedCtx = mockSolutionContext();
      mockedCtx.envInfo.state.set(aadPlugin.name, new ConfigMap());
      mockedCtx.envInfo.state.set(botPlugin.name, new ConfigMap());
      mockedCtx.envInfo.state.set(appStudioPlugin.name, new ConfigMap());
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
      mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
      mockedCtx.envInfo.state.get(botPlugin.name)?.set(BOT_ID, "someFakeId");
      mockedCtx.envInfo.state.get(botPlugin.name)?.set(BOT_DOMAIN, "http://example.com");
      mockedCtx.envInfo.state
        .get(aadPlugin.name)
        ?.set(WEB_APPLICATION_INFO_SOURCE, "mockedWebApplicationInfoResouce");
      mockedCtx.envInfo.state.get(aadPlugin.name)?.set(REMOTE_AAD_ID, "mockedRemoteAadId");
      mockPublishThatAlwaysSucceed(appStudioPlugin);
      const result = await solution.publish(mockedCtx);
      expect(result.isOk()).to.be.true;
    });
  });
});

describe("v2 implementation for publish()", () => {
  it("should work on happy path for Azure projects", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [spfxPluginV2.name],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "./",
    };
    const mockedTokenProvider: M365TokenProvider = new MockedM365Provider();
    const mockedEnvInfo: v2.EnvInfoV2 = {
      envName: "default",
      config: { manifest: { appName: { short: "test-app" } } },
      state: { solution: { output: {}, secrets: {} } },
    };

    const solution = new TeamsAppSolutionV2();
    appStudioPluginV2.publishApplication = async function () {
      return ok(Void);
    };
    const result = await solution.publishApplication(
      mockedCtx,
      mockedInputs,
      mockedEnvInfo,
      mockedTokenProvider
    );
    expect(result.isOk()).to.be.true;
  });
});
