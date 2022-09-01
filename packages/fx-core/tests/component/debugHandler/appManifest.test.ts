// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import fs from "fs-extra";
import * as path from "path";
import * as sinon from "sinon";

import { err, ok, ProjectSettings, SystemError, v3 } from "@microsoft/teamsfx-api";

import { ComponentNames } from "../../../src/component/constants";
import {
  AppManifestDebugArgs,
  AppManifestDebugHandler,
} from "../../../src/component/debugHandler/appManifest";
import * as appstudio from "../../../src/component/resource/appManifest/appStudio";
import { environmentManager } from "../../../src/core/environment";
import * as projectSettingsLoader from "../../../src/core/middleware/projectSettingsLoader";
import { AppStudioClient } from "../../../src/plugins/resource/appstudio/appStudio";
import { AppDefinition } from "../../../src/plugins/resource/appstudio/interfaces/appDefinition";
import { MockM365TokenProvider } from "./utils";

describe("AppManifestDebugHandler", () => {
  const projectPath = path.resolve(__dirname, "data");
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const m365TokenProvider = new MockM365TokenProvider(tenantId);

  describe("prepare", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("load project settings failed", async () => {
      const error = new SystemError(
        "core",
        "LoadProjectSettingsByProjectPathFailed",
        "loadProjectSettingsByProjectPath failed."
      );
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(err(error)));
      const args: AppManifestDebugArgs = {};
      const handler = new AppManifestDebugHandler(projectPath, args, m365TokenProvider);
      const result = await handler.prepare();
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof SystemError);
        chai.assert.deepEqual(result.error.name, error.name);
      }
      sinon.restore();
    });

    it("load env info failed", async () => {
      const projectSetting: ProjectSettings = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSetting)));
      const error = new SystemError("core", "LoadEnvInfoFailed", "loadEnvInfo failed.");
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(err(error)));
      const args: AppManifestDebugArgs = {};
      const handler = new AppManifestDebugHandler(projectPath, args, m365TokenProvider);
      const result = await handler.prepare();
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof SystemError);
        chai.assert.deepEqual(result.error.name, error.name);
      }
      sinon.restore();
    });

    it("happy path", async () => {
      const projectSetting: ProjectSettings = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSetting)));
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      sinon.stub(fs, "readFile").returns(Promise.resolve(Buffer.from("")));
      let called = false;
      sinon.stub(appstudio, "buildTeamsAppPackage").callsFake(async () => {
        called = true;
        return ok("");
      });
      const teamsAppId = "11111111-1111-1111-1111-111111111111";
      const appDefinition: AppDefinition = {
        teamsAppId,
        tenantId,
      };
      sinon.stub(AppStudioClient, "importApp").returns(Promise.resolve(appDefinition));
      sinon.stub(environmentManager, "writeEnvState").callsFake(async () => {
        return ok("");
      });
      const args: AppManifestDebugArgs = {};
      const handler = new AppManifestDebugHandler(projectPath, args, m365TokenProvider);
      const result = await handler.prepare();
      chai.assert(result.isOk());
      chai.assert(called);
      chai.assert.equal(envInfoV3.state[ComponentNames.AppManifest].teamsAppId, teamsAppId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AppManifest].tenantId, tenantId);
      sinon.restore();
    });
  });
});
