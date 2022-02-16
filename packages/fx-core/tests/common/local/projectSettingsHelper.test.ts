// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";

import { ProjectSettings } from "@microsoft/teamsfx-api";

import { ProjectSettingsHelper } from "../../../src/common/local/projectSettingsHelper";

describe("ProjectSettingsHelper", () => {
  it("Azure All", () => {
    const projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
      solutionSettings: {
        name: "fx-solution-azure",
        hostType: "Azure",
        capabilities: ["Tab", "Bot", "MessagingExtension"],
        azureResources: ["function"],
        activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
      },
    } as ProjectSettings;

    const isSpfx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
    const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);
    const migrateFromV1 = ProjectSettingsHelper.isMigrateFromV1(projectSettings);

    chai.assert.isFalse(isSpfx);
    chai.assert.isTrue(includeFrontend);
    chai.assert.isTrue(includeBackend);
    chai.assert.isTrue(includeBot);
    chai.assert.isTrue(includeAAD);
    chai.assert.isFalse(includeSimpleAuth);
    chai.assert.isFalse(migrateFromV1);
  });

  it("Azure All with Simple Auth", () => {
    const projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
      solutionSettings: {
        name: "fx-solution-azure",
        hostType: "Azure",
        capabilities: ["Tab", "Bot", "MessagingExtension"],
        azureResources: ["function"],
        activeResourcePlugins: ["fx-resource-aad-app-for-teams", "fx-resource-simple-auth"],
      },
    } as ProjectSettings;

    const isSpfx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
    const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);
    const migrateFromV1 = ProjectSettingsHelper.isMigrateFromV1(projectSettings);

    chai.assert.isFalse(isSpfx);
    chai.assert.isTrue(includeFrontend);
    chai.assert.isTrue(includeBackend);
    chai.assert.isTrue(includeBot);
    chai.assert.isTrue(includeAAD);
    chai.assert.isTrue(includeSimpleAuth);
    chai.assert.isFalse(migrateFromV1);
  });

  it("SPFx", () => {
    const projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
      solutionSettings: {
        name: "fx-solution-azure",
        hostType: "SPFx",
      },
    } as ProjectSettings;

    const isSpfx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
    const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);
    const migrateFromV1 = ProjectSettingsHelper.isMigrateFromV1(projectSettings);

    chai.assert.isTrue(isSpfx);
    chai.assert.isFalse(includeFrontend);
    chai.assert.isFalse(includeBackend);
    chai.assert.isFalse(includeBot);
    chai.assert.isFalse(includeAAD);
    chai.assert.isFalse(includeSimpleAuth);
    chai.assert.isFalse(migrateFromV1);
  });

  it("Migrate V1", () => {
    const projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
      solutionSettings: {
        name: "fx-solution-azure",
        capabilities: ["Tab"],
        migrateFromV1: true,
      },
    } as ProjectSettings;

    const isSpfx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
    const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);
    const migrateFromV1 = ProjectSettingsHelper.isMigrateFromV1(projectSettings);

    chai.assert.isFalse(isSpfx);
    chai.assert.isFalse(includeFrontend);
    chai.assert.isFalse(includeBackend);
    chai.assert.isFalse(includeBot);
    chai.assert.isFalse(includeAAD);
    chai.assert.isFalse(includeSimpleAuth);
    chai.assert.isTrue(migrateFromV1);
  });

  it("Partial Settings", () => {
    const projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
      solutionSettings: {
        name: "fx-solution-azure",
        hostType: "Azure",
        capabilities: ["Tab", "Unknown"],
        foo: "bar",
        activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
      },
    } as ProjectSettings;

    const isSpfx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
    const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);
    const migrateFromV1 = ProjectSettingsHelper.isMigrateFromV1(projectSettings);

    chai.assert.isFalse(isSpfx);
    chai.assert.isTrue(includeFrontend);
    chai.assert.isFalse(includeBackend);
    chai.assert.isFalse(includeBot);
    chai.assert.isTrue(includeAAD);
    chai.assert.isFalse(includeSimpleAuth);
    chai.assert.isFalse(migrateFromV1);
  });

  it("Partial Settings without AAD plugin", () => {
    const projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
      solutionSettings: {
        name: "fx-solution-azure",
        hostType: "Azure",
        capabilities: ["Tab", "Unknown"],
        foo: "bar",
      },
    } as ProjectSettings;

    const isSpfx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
    const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);
    const migrateFromV1 = ProjectSettingsHelper.isMigrateFromV1(projectSettings);

    chai.assert.isFalse(isSpfx);
    chai.assert.isTrue(includeFrontend);
    chai.assert.isFalse(includeBackend);
    chai.assert.isFalse(includeBot);
    chai.assert.isFalse(includeAAD);
    chai.assert.isFalse(includeSimpleAuth);
    chai.assert.isFalse(migrateFromV1);
  });

  it("Invalid Settings", () => {
    const projectSettings = {
      appName: "unit-test",
      projectId: "11111111-1111-1111-1111-111111111111",
      solutionSettings: {
        name: "fx-solution-azure",
        hostType: "Invalid",
        azureResources: ["foo", "bar"],
        foo: "bar",
      },
    } as ProjectSettings;

    const isSpfx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
    const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);
    const migrateFromV1 = ProjectSettingsHelper.isMigrateFromV1(projectSettings);

    chai.assert.isFalse(isSpfx);
    chai.assert.isFalse(includeFrontend);
    chai.assert.isFalse(includeBackend);
    chai.assert.isFalse(includeBot);
    chai.assert.isFalse(includeAAD);
    chai.assert.isFalse(includeSimpleAuth);
    chai.assert.isFalse(migrateFromV1);
  });
});
