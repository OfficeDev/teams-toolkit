// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AzureSolutionSettings, Platform, ProjectSettings } from "@microsoft/teamsfx-api";
import chai from "chai";
import { it } from "mocha";
import * as sinon from "sinon";
import * as uuid from "uuid";
import { TabSsoItem } from "../../../src/plugins/solution/fx-solution/question";
import { fillInSolutionSettings } from "../../../src/plugins/solution/fx-solution/v2/utils";
import { PluginNames } from "../../../src";
import mockedEnv from "mocked-env";
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
