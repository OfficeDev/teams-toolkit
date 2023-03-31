// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  InputsWithProjectPath,
  err,
  Platform,
  ProjectSettingsV3,
  TeamsAppManifest,
  UserError,
  Stage,
  ok,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { createSandbox } from "sinon";
import * as utils from "../../../src/component/utils";
import { setTools } from "../../../src/core/globalVars";
import { MockTools, randomAppName } from "../../core/utils";
import "../../../src/component/core";
import { canAddSso } from "../../../src/component/feature/sso";
import path from "path";
import Container from "typedi";
import { AddSsoParameters, ComponentNames } from "../../../src/component/constants";
import * as os from "os";
import * as telemetry from "../../../src/core/telemetry";
import { ManifestUtils } from "../../../src/component/resource/appManifest/utils/ManifestUtils";
import { AppManifest } from "../../../src/component/resource/appManifest/appManifest";
import mockedEnv, { RestoreFn } from "mocked-env";
import { FeatureFlagName } from "../../../src/common/constants";
import fs from "fs-extra";
import * as templateUtils from "../../../src/common/template-utils/templatesUtils";
import AdmZip from "adm-zip";
import { getTemplatesFolder } from "../../../src/folder";

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

  it("should AddSso in me project", async () => {
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
    assert.isTrue(res);
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
    components: [
      {
        name: "teams-tab",
        hosting: "azure-storage",
        deploy: true,
        provision: true,
        build: true,
        folder: "tabs",
      },
    ],
  };
  context.projectSetting = projectSetting;
  const manifest = {} as TeamsAppManifest;
  let mockedEnvRestore: RestoreFn;
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
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
    mockedEnvRestore();
  });

  it("happy path", async () => {
    sandbox.stub(AppManifest.prototype, "addCapability").resolves(ok(undefined));
    sandbox.stub(ManifestUtils.prototype, "isExistingTab").resolves(ok(true));
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      language: "typescript",
      "app-name": appName,
      stage: Stage.addFeature,
      features: "sso",
    };

    const component = Container.get(ComponentNames.SSO) as any;
    const ssoRes = await component.add(context, inputs);
    assert.isTrue(ssoRes.isOk());
  });

  it("add sso with generateManifest failed", async () => {
    const aadComponent = Container.get(ComponentNames.AadApp) as any;
    sandbox.stub(aadComponent, "generateManifest").resolves(err(undefined));

    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      language: "typescript",
      "app-name": appName,
    };

    const component = Container.get(ComponentNames.SSO) as any;
    const ssoRes = await component.add(context, inputs);
    assert.isTrue(ssoRes.isErr());
  });

  it("add sso with generateBicep failed", async () => {
    const aadComponent = Container.get(ComponentNames.AadApp) as any;
    sandbox.stub(aadComponent, "generateBicep").resolves(err(undefined));

    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      language: "typescript",
      "app-name": appName,
    };

    const component = Container.get(ComponentNames.SSO) as any;
    const ssoRes = await component.add(context, inputs);
    assert.isTrue(ssoRes.isErr());
  });

  it("add sso with generateAuthFiles failed", async () => {
    const aadComponent = Container.get(ComponentNames.AadApp) as any;
    sandbox.stub(aadComponent, "generateAuthFiles").resolves(err(undefined));

    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      language: "typescript",
      "app-name": appName,
    };

    const component = Container.get(ComponentNames.SSO) as any;
    const ssoRes = await component.add(context, inputs);
    assert.isTrue(ssoRes.isErr());
  });

  it("add sso with generateAuthFiles failed", async () => {
    const aadComponent = Container.get(ComponentNames.AadApp) as any;
    sandbox.stub(aadComponent, "generateAuthFiles").resolves(err(undefined));

    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      language: "typescript",
      "app-name": appName,
    };

    const component = Container.get(ComponentNames.SSO) as any;
    const ssoRes = await component.add(context, inputs);
    assert.isTrue(ssoRes.isErr());
  });

  it("add sso with appManifest failed", async () => {
    sandbox.stub(AppManifest.prototype, "addCapability").resolves(err(undefined as any));

    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      language: "typescript",
      "app-name": appName,
    };

    const component = Container.get(ComponentNames.SSO) as any;
    const ssoRes = await component.add(context, inputs);
    assert.isTrue(ssoRes.isErr());
  });

  it("happy path for function scenario", async () => {
    sandbox.stub(AppManifest.prototype, "addCapability").resolves(ok(undefined));
    sandbox.stub(ManifestUtils.prototype, "isExistingTab").resolves(ok(true));
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      language: "typescript",
      "app-name": appName,
      stage: Stage.addFeature,
      features: "function",
    };

    const component = Container.get(ComponentNames.SSO) as any;
    const ssoRes = await component.add(context, inputs);
    assert.isTrue(ssoRes.isOk());
  });
});

describe("SSO can add in VS V3 project", () => {
  let mockedEnvRestore: RestoreFn;
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
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({ [FeatureFlagName.V3]: "true" });
  });

  afterEach(() => {
    mockedEnvRestore();
    sandbox.restore();
  });

  it("happy path for VS v3 project", async () => {
    const component = Container.get(ComponentNames.SSO) as any;
    const inputs: InputsWithProjectPath = {
      projectPath: "projectPath",
      platform: Platform.VS,
      language: "csharp",
      "app-name": appName,
      stage: Stage.addFeature,
    };

    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(templateUtils, "unzip").callsFake(async (zip: AdmZip, dstPath: string) => {
      const zipFiles = zip.getEntries().map((element, index, array) => {
        return element.entryName;
      });
      assert.isTrue(zipFiles.includes("aad.manifest.template.json"));
      assert.isTrue(zipFiles.includes("Enable SSO.txt"));
    });
    const ssoRes = await component.add(context, inputs);
    assert.isTrue(ssoRes.isOk());
  });

  it("add sso failed for VS v3 project due to project path is empty", async () => {
    const component = Container.get(ComponentNames.SSO) as any;
    const inputs: InputsWithProjectPath = {
      projectPath: "projectPath",
      platform: Platform.VS,
      language: "csharp",
      "app-name": appName,
      stage: Stage.addFeature,
    };

    sandbox.stub(fs, "pathExists").resolves(false);
    const ssoRes = await component.add(context, inputs);
    assert.isTrue(ssoRes.isErr() && ssoRes.error.name === "FileNotFoundError");
  });

  it("add sso failed for VS v3 project due to unexpected error", async () => {
    const component = Container.get(ComponentNames.SSO) as any;
    const inputs: InputsWithProjectPath = {
      projectPath: "projectPath",
      platform: Platform.VS,
      language: "csharp",
      "app-name": appName,
      stage: Stage.addFeature,
    };

    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "remove").resolves();
    sandbox.stub(templateUtils, "unzip").throws(new Error("errorMessage"));
    const ssoRes = await component.add(context, inputs);
    console.log(ssoRes);
    assert.isTrue(ssoRes.isErr() && ssoRes.error.name === "FailedToCreateAuthFiles");
  });
});
