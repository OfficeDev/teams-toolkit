// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";

import { ProjectSettings, ProjectSettingsV3 } from "@microsoft/teamsfx-api";

import { ProjectSettingsHelper } from "../../../src/common/local/projectSettingsHelper";
import { isExistingTabApp } from "../../../src/common/projectSettingsHelper";

import { convertProjectSettingsV2ToV3 } from "../../../src/component/migrate";

describe("ProjectSettingsHelper", () => {
  it("Azure All", () => {
    let projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
      solutionSettings: {
        name: "fx-solution-azure",
        hostType: "Azure",
        capabilities: ["Tab", "Bot", "MessagingExtension"],
        azureResources: ["function"],
        activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
      },
      components: [
        { name: "teams-tab" },
        { name: "teams-bot" },
        { name: "teams-api" },
        { name: "aad-app" },
      ],
    } as ProjectSettingsV3;
    projectSettings = convertProjectSettingsV2ToV3(projectSettings, ".");
    const isSpfx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
    const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);

    chai.assert.isFalse(isSpfx);
    chai.assert.isTrue(includeFrontend);
    chai.assert.isTrue(includeBackend);
    chai.assert.isTrue(includeBot);
    chai.assert.isTrue(includeAAD);
    chai.assert.isFalse(includeSimpleAuth);
  });

  it("Azure All with Simple Auth", () => {
    let projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
      solutionSettings: {
        name: "fx-solution-azure",
        hostType: "Azure",
        capabilities: ["Tab", "Bot", "MessagingExtension"],
        azureResources: ["function"],
        activeResourcePlugins: ["fx-resource-aad-app-for-teams", "fx-resource-simple-auth"],
      },
      components: [
        { name: "teams-tab" },
        { name: "teams-bot" },
        { name: "teams-api" },
        { name: "aad-app" },
        { name: "simple-auth" },
      ],
    } as ProjectSettings;
    projectSettings = convertProjectSettingsV2ToV3(projectSettings, ".");
    const isSpfx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
    const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);

    chai.assert.isFalse(isSpfx);
    chai.assert.isTrue(includeFrontend);
    chai.assert.isTrue(includeBackend);
    chai.assert.isTrue(includeBot);
    chai.assert.isTrue(includeAAD);
    chai.assert.isTrue(includeSimpleAuth);
  });

  it("SPFx", () => {
    let projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
      solutionSettings: {
        name: "fx-solution-azure",
        hostType: "SPFx",
      },
      components: [{ name: "teams-tab", hosting: "spfx" }],
    } as ProjectSettingsV3;
    projectSettings = convertProjectSettingsV2ToV3(projectSettings, ".");
    const isSpfx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
    const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);

    chai.assert.isTrue(isSpfx);
    chai.assert.isFalse(includeFrontend);
    chai.assert.isFalse(includeBackend);
    chai.assert.isFalse(includeBot);
    chai.assert.isFalse(includeAAD);
    chai.assert.isFalse(includeSimpleAuth);
  });

  it("Partial Settings", () => {
    let projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
      solutionSettings: {
        name: "fx-solution-azure",
        hostType: "Azure",
        capabilities: ["Tab", "Unknown"],
        foo: "bar",
        activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
      },
      components: [{ name: "teams-tab" }, { name: "aad-app" }],
    } as ProjectSettingsV3;
    projectSettings = convertProjectSettingsV2ToV3(projectSettings, ".");
    const isSpfx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
    const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);

    chai.assert.isFalse(isSpfx);
    chai.assert.isTrue(includeFrontend);
    chai.assert.isFalse(includeBackend);
    chai.assert.isFalse(includeBot);
    chai.assert.isTrue(includeAAD);
    chai.assert.isFalse(includeSimpleAuth);
  });

  it("Partial Settings without AAD plugin", () => {
    let projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
      solutionSettings: {
        name: "fx-solution-azure",
        hostType: "Azure",
        capabilities: ["Tab", "Unknown"],
        foo: "bar",
        activeResourcePlugins: ["fx-resource-frontend-hosting"],
      },
      components: [{ name: "teams-tab" }],
    } as ProjectSettingsV3;
    projectSettings = convertProjectSettingsV2ToV3(projectSettings, ".");
    const isSpfx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
    const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);

    chai.assert.isFalse(isSpfx);
    chai.assert.isTrue(includeFrontend);
    chai.assert.isFalse(includeBackend);
    chai.assert.isFalse(includeBot);
    chai.assert.isFalse(includeAAD);
    chai.assert.isFalse(includeSimpleAuth);
  });

  it("Invalid Settings", () => {
    let projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
      solutionSettings: {
        name: "fx-solution-azure",
        hostType: "Invalid",
        azureResources: ["foo", "bar"],
        foo: "bar",
        activeResourcePlugins: [],
      },
      components: [],
    } as ProjectSettings;
    projectSettings = convertProjectSettingsV2ToV3(projectSettings, ".");
    const isSpfx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
    const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);

    chai.assert.isFalse(isSpfx);
    chai.assert.isFalse(includeFrontend);
    chai.assert.isFalse(includeBackend);
    chai.assert.isFalse(includeBot);
    chai.assert.isFalse(includeAAD);
    chai.assert.isFalse(includeSimpleAuth);
  });

  it("Existing tab app", () => {
    const projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
    } as unknown as ProjectSettings;
    const existingTabApp = isExistingTabApp(projectSettings);
    chai.assert.isFalse(existingTabApp);
  });
});
