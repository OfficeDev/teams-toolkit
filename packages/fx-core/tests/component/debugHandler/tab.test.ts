// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import fs from "fs-extra";
import * as path from "path";
import * as sinon from "sinon";

import {
  err,
  ok,
  Void,
  ProjectSettings,
  ProjectSettingsV3,
  SystemError,
  UserError,
  v3,
} from "@microsoft/teamsfx-api";

import { ComponentNames, PathConstants } from "../../../src/component/constants";
import {
  DebugArgumentEmptyError,
  InvalidTabBaseUrlError,
} from "../../../src/component/debugHandler/error";
import {
  LocalEnvKeys,
  LocalEnvProvider,
  LocalEnvs,
} from "../../../src/component/debugHandler/localEnvProvider";
import { TabDebugArgs, TabDebugHandler } from "../../../src/component/debugHandler/tab";
import { environmentManager } from "../../../src/core/environment";
import * as projectSettingsLoader from "../../../src/core/middleware/projectSettingsLoader";
import { MockM365TokenProvider, runDebugActions } from "./utils";
import { MockLogProvider, MockTelemetryReporter, MockUserInteraction } from "../../core/utils";
import * as utils from "../../../src/component/debugHandler/utils";

describe("TabDebugHandler", () => {
  const projectPath = path.resolve(__dirname, "data");
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const m365TokenProvider = new MockM365TokenProvider(tenantId);
  const logger = new MockLogProvider();
  const telemetry = new MockTelemetryReporter();
  const ui = new MockUserInteraction();

  describe("setUp", () => {
    beforeEach(() => {
      sinon.stub(fs, "writeFile").callsFake(async () => {});
    });

    afterEach(() => {
      sinon.restore();
    });

    it("invalid args: undefined baseUrl", async () => {
      const args: TabDebugArgs = {};
      const handler = new TabDebugHandler(
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
        chai.assert.equal(result.error.message, DebugArgumentEmptyError("baseUrl").message);
      }
    });

    it("invalid args: invalid url", async () => {
      const args: TabDebugArgs = {
        baseUrl: "https://",
      };
      const handler = new TabDebugHandler(
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
        chai.assert.equal(result.error.message, InvalidTabBaseUrlError().message);
      }
    });

    it("invalid args: http protocol", async () => {
      const args: TabDebugArgs = {
        baseUrl: "http://localhost:53000",
      };
      const handler = new TabDebugHandler(
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
        chai.assert.equal(result.error.message, InvalidTabBaseUrlError().message);
      }
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
      const args: TabDebugArgs = {
        baseUrl: "https://localhost:53000",
      };
      const handler = new TabDebugHandler(
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
      const args: TabDebugArgs = {
        baseUrl: "https://localhost:53000",
      };
      const handler = new TabDebugHandler(
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
      const projectSettingV3: ProjectSettingsV3 = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          azureResources: [] as string[],
          capabilities: ["Tab"],
          activeResourcePlugins: ["fx-resource-frontend-hosting", "fx-resource-appstudio"],
        },
        components: [{ name: "teams-tab", sso: false }],
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSettingV3)));
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
        },
      };
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      sinon.stub(environmentManager, "writeEnvState").callsFake(async () => {
        return ok("");
      });
      let frontendEnvs: LocalEnvs = {
        template: {},
        teamsfx: {},
        customized: {},
      };
      sinon
        .stub(LocalEnvProvider.prototype, "loadFrontendLocalEnvs")
        .returns(Promise.resolve(frontendEnvs));
      sinon.stub(LocalEnvProvider.prototype, "saveFrontendLocalEnvs").callsFake(async (envs) => {
        frontendEnvs = envs;
        return "";
      });
      const baseUrl = "https://localhost:53000";
      const args: TabDebugArgs = {
        baseUrl,
      };
      const handler = new TabDebugHandler(
        projectPath,
        args,
        m365TokenProvider,
        logger,
        telemetry,
        ui
      );
      const result = await runDebugActions(handler.getActions());
      chai.assert(result.isOk());
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsTab].endpoint, baseUrl);
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsTab].domain, "localhost");
      chai.assert.equal(
        envInfoV3.state[ComponentNames.TeamsTab].indexPath,
        PathConstants.reactTabIndexPath
      );
      const expectedEnvs: LocalEnvs = {
        template: {
          [LocalEnvKeys.frontend.template.Browser]: "none",
          [LocalEnvKeys.frontend.template.Https]: "true",
          [LocalEnvKeys.frontend.template.Port]: "53000",
        },
        teamsfx: {},
        customized: {},
      };
      chai.assert.deepEqual(frontendEnvs, expectedEnvs);
      sinon.restore();
    });

    it("check m365 tenant happy path", async () => {
      const projectSettingV3: ProjectSettingsV3 = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          azureResources: [] as string[],
          capabilities: ["Tab"],
          activeResourcePlugins: ["fx-resource-frontend-hosting", "fx-resource-appstudio"],
        },
        components: [{ name: "teams-tab", sso: false }],
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSettingV3)));
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
          [ComponentNames.TeamsTab]: {},
          [ComponentNames.AppManifest]: {
            tenantId: "22222222-2222-2222-2222-222222222222",
          },
        },
      };
      let called = false;
      sinon.stub(utils, "checkM365Tenant").callsFake(async () => {
        called = true;
        return ok(Void);
      });
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      sinon.stub(environmentManager, "writeEnvState").callsFake(async () => {
        return ok("");
      });
      let frontendEnvs: LocalEnvs = {
        template: {},
        teamsfx: {},
        customized: {},
      };
      sinon
        .stub(LocalEnvProvider.prototype, "loadFrontendLocalEnvs")
        .returns(Promise.resolve(frontendEnvs));
      sinon.stub(LocalEnvProvider.prototype, "saveFrontendLocalEnvs").callsFake(async (envs) => {
        frontendEnvs = envs;
        return "";
      });
      const baseUrl = "https://localhost:53000";
      const args: TabDebugArgs = {
        baseUrl,
      };
      const handler = new TabDebugHandler(
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
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsTab].endpoint, baseUrl);
      chai.assert.equal(envInfoV3.state[ComponentNames.TeamsTab].domain, "localhost");
      chai.assert.equal(
        envInfoV3.state[ComponentNames.TeamsTab].indexPath,
        PathConstants.reactTabIndexPath
      );
      const expectedEnvs: LocalEnvs = {
        template: {
          [LocalEnvKeys.frontend.template.Browser]: "none",
          [LocalEnvKeys.frontend.template.Https]: "true",
          [LocalEnvKeys.frontend.template.Port]: "53000",
        },
        teamsfx: {},
        customized: {},
      };
      chai.assert.deepEqual(frontendEnvs, expectedEnvs);
      sinon.restore();
    });

    it("check m365 tenant failed", async () => {
      const projectSettingV3: ProjectSettingsV3 = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          azureResources: [] as string[],
          capabilities: ["Tab"],
          activeResourcePlugins: ["fx-resource-frontend-hosting", "fx-resource-appstudio"],
        },
        components: [{ name: "teams-tab", sso: false }],
      };
      sinon
        .stub(projectSettingsLoader, "loadProjectSettingsByProjectPath")
        .returns(Promise.resolve(ok(projectSettingV3)));
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
          [ComponentNames.TeamsTab]: {},
          [ComponentNames.AppManifest]: {
            tenantId: "22222222-2222-2222-2222-222222222222",
          },
        },
      };
      let called = false;
      const error = new SystemError("solution", "checkM365TenantFailed", "checkM365Tenant failed");
      sinon.stub(utils, "checkM365Tenant").callsFake(async () => {
        called = true;
        return err(error);
      });
      sinon.stub(environmentManager, "loadEnvInfo").returns(Promise.resolve(ok(envInfoV3)));
      const baseUrl = "https://localhost:53000";
      const args: TabDebugArgs = {
        baseUrl,
      };
      const handler = new TabDebugHandler(
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
        chai.assert.equal(result.error.message, error.message);
      }
      sinon.restore();
    });
  });
});
