// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  InputsWithProjectPath,
  ok,
  err,
  Platform,
  ProjectSettingsV3,
  TeamsAppManifest,
  FxError,
  UserError,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { createSandbox, SinonStub } from "sinon";
import * as utils from "../../../src/component/utils";
import { setTools } from "../../../src/core/globalVars";
import { MockTools, randomAppName } from "../../core/utils";
import "../../../src/component/core";
import { canAddSso } from "../../../src/component/feature/sso";
import path from "path";
import Container from "typedi";
import { environmentManager } from "../../../src";
import { ComponentNames } from "../../../src/component/constants";
import { manifestUtils } from "../../../src/component/resource/appManifest/utils";
import fs from "fs-extra";
import * as os from "os";
import * as projectSettingsLoader from "../../../src/core/middleware/projectSettingsLoader";
import * as aadManifest from "../../../src/core/generateAadManifestTemplate";
import * as templatesAction from "../../../src/common/template-utils/templatesActions";
import * as telemetry from "../../../src/core/telemetry";

describe("SSO can add in project", () => {
  const sandbox = createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const appName = `unittest${randomAppName()}`;
  const context = utils.createContextV3();
  const basicProjectSetting: ProjectSettingsV3 = {
    appName: "",
    projectId: "",
    programmingLanguage: "typescript",
    components: [],
  };
  context.projectSetting = basicProjectSetting;
  beforeEach(() => {});

  afterEach(() => {
    sandbox.restore();
  });

  it("should AddSso in tab-sso project without sso component", async () => {
    const projectSetting: ProjectSettingsV3 = {
      ...basicProjectSetting,
      components: [
        {
          name: "teams-tab",
          hosting: "azure-storage",
          deploy: true,
          provision: true,
          build: true,
          folder: "tabs",
          sso: true,
        },
      ],
    };
    const res = await canAddSso(projectSetting);
    assert.isTrue(res);
  });

  it("shouldn't AddSso in tab-sso project with sso", async () => {
    const projectSetting: ProjectSettingsV3 = {
      ...basicProjectSetting,
      components: [
        {
          name: "teams-tab",
          hosting: "azure-storage",
          deploy: true,
          provision: true,
          build: true,
          folder: "tabs",
          sso: true,
        },
        {
          name: "aad-app",
          provision: true,
          deploy: true,
        },
      ],
    };
    const res = await canAddSso(projectSetting);
    assert.isFalse(res);
  });

  it("shouldn't AddSso in me project", async () => {
    const projectSetting: ProjectSettingsV3 = {
      ...basicProjectSetting,
      components: [
        {
          name: "teams-bot",
          hosting: "azure-web-app",
          deploy: true,
          capabilities: ["message-extension"],
          build: true,
          folder: "bot",
        },
        {
          name: "aad-app",
          provision: true,
          deploy: true,
        },
      ],
    };
    const res = await canAddSso(projectSetting);
    assert.isFalse(res);
  });

  it("shouldn't AddSso in bot project with function", async () => {
    const projectSetting: ProjectSettingsV3 = {
      ...basicProjectSetting,
      components: [
        {
          name: "teams-bot",
          hosting: "azure-function",
          deploy: true,
          capabilities: ["message-extension"],
          build: true,
          folder: "bot",
        },
        {
          name: "aad-app",
          provision: true,
          deploy: true,
        },
      ],
    };
    const res = await canAddSso(projectSetting);
    assert.isFalse(res);
  });
});

describe("SSO feature", () => {
  const sandbox = createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const context = utils.createContextV3();
  const projectSetting: ProjectSettingsV3 = {
    appName: "",
    projectId: "",
    programmingLanguage: "typescript",
    components: [],
  };
  context.projectSetting = projectSetting;
  const manifest = {} as TeamsAppManifest;

  let writeFileStub: SinonStub;
  beforeEach(() => {
    sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(manifestUtils, "writeAppManifest").resolves(ok(undefined));
    sandbox.stub(projectSettingsLoader, "loadProjectSettings").resolves(ok(projectSetting));
    sandbox.stub(fs, "readJson").resolves({});
    sandbox.stub(fs, "writeJSON").resolves();
    sandbox.stub(fs, "writeJson").resolves();
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "copyFile").resolves();
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "appendFile").resolves();
    writeFileStub = sandbox.stub(fs, "writeFile").resolves();
    sandbox.stub(fs, "ensureDirSync").returns();
    sandbox.stub(fs, "readdirSync").returns([]);
    sandbox.stub(fs, "appendFileSync").returns();
    sandbox.stub(fs, "writeFileSync").returns();
    sandbox.stub(environmentManager, "listRemoteEnvConfigs").resolves(ok(["dev"]));
    sandbox.stub(aadManifest, "generateAadManifestTemplate").resolves();
    sandbox.stub(telemetry, "sendErrorTelemetryThenReturnError").returns(
      new UserError({
        name: "mock error",
        message: "mock error message",
        displayMessage: "error message",
        source: "mocked source",
      })
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("add sso", async () => {
    sandbox.stub(templatesAction, "scaffoldFromTemplates").resolves();
    sandbox.stub(utils.bicepUtils, "persistBiceps").resolves(ok(undefined));
    const aadComponent = Container.get(ComponentNames.AadApp) as any;
    sandbox.stub(aadComponent, "generateManifest").resolves(err(undefined));

    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      language: "typescript",
      "app-name": appName,
    };
    const tabComponent = Container.get("teams-tab") as any;
    const addTabRes = await tabComponent.add(context, inputs);
    if (addTabRes.isErr()) {
      console.log(addTabRes.error);
    }
    assert.isTrue(addTabRes.isOk());

    const component = Container.get(ComponentNames.SSO) as any;
    const ssoRes = await component.add(context, inputs);
    assert.isTrue(ssoRes.isErr());
  });
});
