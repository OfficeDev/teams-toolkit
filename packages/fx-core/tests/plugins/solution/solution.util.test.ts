// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureSolutionSettings,
  err,
  ok,
  Platform,
  ProjectSettings,
  UserError,
  v3,
} from "@microsoft/teamsfx-api";
import chai from "chai";
import { it } from "mocha";
import * as sinon from "sinon";
import * as uuid from "uuid";
import { TabSsoItem } from "../../../src/plugins/solution/fx-solution/question";
import { fillInSolutionSettings } from "../../../src/plugins/solution/fx-solution/v2/utils";
import { PluginNames } from "../../../src";
import mockedEnv from "mocked-env";
import * as arm from "../../../src/plugins/solution/fx-solution/arm";
import { BuiltInFeaturePluginNames } from "../../../src/plugins/solution/fx-solution/v3/constants";
import { handleConfigFilesWhenSwitchAccount } from "../../../src/plugins/solution/fx-solution/utils/util";
import { ComponentNames } from "../../../src/component/constants";
const tool = require("../../../src/common/tools");
const expect = chai.expect;

describe("util: fillInSolutionSettings() with AAD manifest enabled", async () => {
  const mocker = sinon.createSandbox();
  let projectSettings: ProjectSettings;
  let mockedEnvRestore: () => void;

  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_AAD_MANIFEST: "true",
    });

    projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "test",
        version: "1.0",
      },
    };

    // mocker.stub(tool, "isAadManifestEnabled").returns(true);
  });

  afterEach(async () => {
    mockedEnvRestore();
    mocker.restore();
  });

  it("Tab with SSO", async () => {
    const mockInput = {
      capabilities: ["Tab"],
      platform: Platform.VSCode,
    };

    const res = fillInSolutionSettings(projectSettings, mockInput);

    const solutionSettings = projectSettings?.solutionSettings as AzureSolutionSettings;
    expect(solutionSettings?.capabilities?.includes(TabSsoItem.id)).to.be.true;
    expect(solutionSettings?.activeResourcePlugins?.includes(PluginNames.AAD)).to.be.true;
  });

  it("Tab without SSO", async () => {
    const mockInput = {
      capabilities: ["TabNonSso"],
      platform: Platform.VSCode,
    };

    const res = fillInSolutionSettings(projectSettings, mockInput);

    const solutionSettings = projectSettings?.solutionSettings as AzureSolutionSettings;
    expect(solutionSettings?.capabilities?.includes(TabSsoItem.id)).to.be.false;
    expect(solutionSettings?.activeResourcePlugins?.includes(PluginNames.AAD)).to.be.false;
  });

  it("M365 SSO Tab", async () => {
    const mockInput = {
      capabilities: ["M365SsoLaunchPage"],
      platform: Platform.VSCode,
    };

    const res = fillInSolutionSettings(projectSettings, mockInput);
    const solutionSettings = projectSettings?.solutionSettings as AzureSolutionSettings;
    expect(solutionSettings?.capabilities?.includes(TabSsoItem.id)).to.be.true;
    expect(solutionSettings?.activeResourcePlugins?.includes(PluginNames.AAD)).to.be.true;
  });
});

describe("util: handleConfigFilesWhenSwitchAccount", async () => {
  const mocker = sinon.createSandbox();
  afterEach(async () => {
    mocker.restore();
  });

  it("success with v2 bot service", async () => {
    // Arrange
    const spy = mocker.stub(arm, "updateAzureParameters").resolves(ok(undefined));
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {}, [BuiltInFeaturePluginNames.bot]: { resourceId: "mockResourceId" } },
      config: {},
    };
    const appName = "app-name";
    const projectPath = "project-path";

    // Act
    const res = await handleConfigFilesWhenSwitchAccount(envInfo, appName, projectPath, true, true);

    // Assert
    expect(spy.calledOnceWithExactly(projectPath, appName, "dev", true, true, true));
    expect(res.isOk()).equal(true);
  });

  it("success with v3 bot service", async () => {
    // Arrange
    const spy = mocker.stub(arm, "updateAzureParameters").resolves(ok(undefined));
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {}, [ComponentNames.TeamsBot]: { resourceId: "mockResourceId" } },
      config: {},
    };
    const appName = "app-name";
    const projectPath = "project-path";

    // Act
    const res = await handleConfigFilesWhenSwitchAccount(envInfo, appName, projectPath, true, true);

    // Assert
    expect(spy.calledOnceWithExactly(projectPath, appName, "dev", true, true, true));
    expect(res.isOk()).equal(true);
  });

  it("success without bot resource id", async () => {
    // Arrange
    const spy = mocker.stub(arm, "updateAzureParameters").resolves(ok(undefined));
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {}, [ComponentNames.TeamsBot]: { botId: "mockResourceId" } },
      config: {},
    };
    const appName = "app-name";
    const projectPath = "project-path";

    // Act
    const res = await handleConfigFilesWhenSwitchAccount(envInfo, appName, projectPath, true, true);

    // Assert
    expect(spy.calledOnceWithExactly(projectPath, appName, "dev", true, true, false));
    expect(res.isOk()).equal(true);
  });

  it("success without bot key", async () => {
    // Arrange
    const spy = mocker.stub(arm, "updateAzureParameters").resolves(ok(undefined));
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {} },
      config: {},
    };
    const appName = "app-name";
    const projectPath = "project-path";

    // Act
    const res = await handleConfigFilesWhenSwitchAccount(envInfo, appName, projectPath, true, true);

    // Assert
    expect(spy.calledOnceWithExactly(projectPath, appName, "dev", true, true, false));
    expect(res.isOk()).equal(true);
  });

  it("error when updating parameters", async () => {
    // Arrange
    const spy = mocker
      .stub(arm, "updateAzureParameters")
      .resolves(err(new UserError("solution", "error", "error")));
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {} },
      config: {},
    };
    const appName = "app-name";
    const projectPath = "project-path";

    // Act
    const res = await handleConfigFilesWhenSwitchAccount(envInfo, appName, projectPath, true, true);

    // Assert
    expect(spy.calledOnceWithExactly(projectPath, appName, "dev", true, true, false));
    expect(res.isErr()).equal(true);
  });
});
