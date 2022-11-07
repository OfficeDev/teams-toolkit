// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import fs from "fs-extra";
import * as path from "path";
import * as sinon from "sinon";

import { err, ok, ProjectSettings, SystemError, UserError, v3, Void } from "@microsoft/teamsfx-api";

import { ComponentNames } from "../../../src/component/constants";
import {
  AppManifestDebugArgs,
  AppManifestDebugHandler,
} from "../../../src/component/debugHandler/appManifest";
import {
  AppManifestPackageNotExistError,
  DebugArgumentEmptyError,
  InvalidAppManifestPackageFileFormatError,
} from "../../../src/component/debugHandler/error";
import * as appstudio from "../../../src/component/resource/appManifest/appStudio";
import { environmentManager } from "../../../src/core/environment";
import * as projectSettingsLoader from "../../../src/core/middleware/projectSettingsLoader";
import { AppStudioClient } from "../../../src/component/resource/appManifest/appStudioClient";
import { AppDefinition } from "../../../src/component/resource/appManifest/interfaces/appDefinition";
import { MockM365TokenProvider, runDebugActions } from "./utils";
import { MockLogProvider, MockTelemetryReporter, MockUserInteraction } from "../../core/utils";
import * as utils from "../../../src/component/debugHandler/utils";

describe("AppManifestDebugHandler", () => {
  const projectPath = path.resolve(__dirname, "data");
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const m365TokenProvider = new MockM365TokenProvider(tenantId);
  const logger = new MockLogProvider();
  const telemetry = new MockTelemetryReporter();
  const ui = new MockUserInteraction();

  describe("prepare", () => {
    beforeEach(() => {
      sinon.stub(fs, "writeFile").callsFake(async () => {});
    });

    afterEach(() => {
      sinon.restore();
    });

    it("invalid args: empty appPackagePath", async () => {
      sinon.stub(fs, "pathExists").callsFake(async () => {
        return false;
      });
      const args: AppManifestDebugArgs = {
        appPackagePath: "",
      };
      const handler = new AppManifestDebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UserError);
        chai.assert.equal(result.error.message, DebugArgumentEmptyError("appPackagePath").message);
      }
      sinon.restore();
    });

    it("invalid args: path not exist", async () => {
      sinon.stub(fs, "pathExists").callsFake(async () => {
        return false;
      });
      const appPackagePath = "xxx";
      const args: AppManifestDebugArgs = {
        appPackagePath,
      };
      const handler = new AppManifestDebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UserError);
        const error = AppManifestPackageNotExistError(appPackagePath);
        chai.assert.equal(result.error.name, error.name);
        chai.assert.equal(result.error.message, error.message);
      }
      sinon.restore();
    });

    it("invalid args: invalid format", async () => {
      sinon.stub(fs, "pathExists").callsFake(async () => {
        return true;
      });
      const appPackagePath = "xxx.rar";
      const args: AppManifestDebugArgs = {
        appPackagePath,
      };
      const handler = new AppManifestDebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UserError);
        chai.assert.equal(result.error.name, InvalidAppManifestPackageFileFormatError().name);
      }
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
      const handler = new AppManifestDebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
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
      const handler = new AppManifestDebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
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
      sinon
        .stub(appstudio, "checkIfAppInDifferentAcountSameTenant")
        .returns(Promise.resolve(ok(false)));
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
      const handler = new AppManifestDebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isOk());
      chai.assert(called);
      chai.assert.equal(envInfoV3.state[ComponentNames.AppManifest].teamsAppId, teamsAppId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AppManifest].tenantId, tenantId);
      sinon.restore();
    });

    it("check m365 tenant happy path", async () => {
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
          [ComponentNames.AppManifest]: {
            tenantId: "22222222-2222-2222-2222-222222222222",
          },
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      let checkM365TenantCalled = false;
      sinon.stub(utils, "checkM365Tenant").callsFake(async () => {
        checkM365TenantCalled = true;
        return ok(Void);
      });
      sinon.stub(fs, "readFile").returns(Promise.resolve(Buffer.from("")));
      sinon
        .stub(appstudio, "checkIfAppInDifferentAcountSameTenant")
        .returns(Promise.resolve(ok(false)));
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
      const handler = new AppManifestDebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isOk());
      chai.assert(checkM365TenantCalled);
      chai.assert(called);
      chai.assert.equal(envInfoV3.state[ComponentNames.AppManifest].teamsAppId, teamsAppId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AppManifest].tenantId, tenantId);
      sinon.restore();
    });

    it("check m365 tenant failed", async () => {
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
          [ComponentNames.AppManifest]: {
            tenantId: "22222222-2222-2222-2222-222222222222",
          },
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      let called = false;
      const error = new SystemError("solution", "checkM365TenantFailed", "checkM365Tenant failed");
      sinon.stub(utils, "checkM365Tenant").callsFake(async () => {
        called = true;
        return err(error);
      });
      const args: AppManifestDebugArgs = {};
      const handler = new AppManifestDebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(called);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof SystemError);
        chai.assert.deepEqual(result.error.name, error.name);
      }
      sinon.restore();
    });

    it("different m365 account but same tenant happy path", async () => {
      const projectSetting: ProjectSettings = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
      };
      const oldAppId = "oldAppId";
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSetting)));
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
          [ComponentNames.AppManifest]: {
            teamsAppId: oldAppId,
            tenantId: "22222222-2222-2222-2222-222222222222",
          },
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      let checkM365TenantCalled = false;
      sinon.stub(utils, "checkM365Tenant").callsFake(async () => {
        checkM365TenantCalled = true;
        return ok(Void);
      });
      sinon.stub(fs, "readFile").returns(Promise.resolve(Buffer.from("")));
      sinon
        .stub(appstudio, "checkIfAppInDifferentAcountSameTenant")
        .returns(Promise.resolve(ok(true)));
      sinon
        .stub(appstudio, "buildTeamsAppPackage")
        .callsFake(async (projectSetings, path, envInfo) => {
          if (envInfo.state[ComponentNames.AppManifest].teamsAppId !== oldAppId) {
            return ok("");
          } else {
            return err(new UserError("error", "error", "", ""));
          }
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
      const handler = new AppManifestDebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isOk());
      chai.assert.equal(envInfoV3.state[ComponentNames.AppManifest].teamsAppId, teamsAppId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AppManifest].tenantId, tenantId);
      sinon.restore();
    });

    it("check different account but same tenant error", async () => {
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
      sinon
        .stub(appstudio, "checkIfAppInDifferentAcountSameTenant")
        .returns(Promise.resolve(err(new UserError("error", "error", "", ""))));
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
      const handler = new AppManifestDebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isOk());
      chai.assert(called);
      chai.assert.equal(envInfoV3.state[ComponentNames.AppManifest].teamsAppId, teamsAppId);
      chai.assert.equal(envInfoV3.state[ComponentNames.AppManifest].tenantId, tenantId);
      sinon.restore();
    });
  });
});
