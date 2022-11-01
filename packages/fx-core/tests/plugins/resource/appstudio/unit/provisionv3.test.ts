// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import { v4 as uuid } from "uuid";
import * as os from "os";
import * as path from "path";
import fs from "fs-extra";
import AdmZip from "adm-zip";
import Container from "typedi";
import {
  ProjectSettings,
  v2,
  Platform,
  TokenProvider,
  TeamsAppManifest,
  ResourceContextV3,
  ProjectSettingsV3,
  ok,
} from "@microsoft/teamsfx-api";
import { AppStudioClient } from "./../../../../../src/component/resource/appManifest/appStudioClient";
import { Constants } from "../../../../../src/component/resource/appManifest/constants";
import { AppStudioError } from "./../../../../../src/component/resource/appManifest/errors";
import { AppDefinition } from "./../../../../../src/component/resource/appManifest/interfaces/appDefinition";
import { manifestUtils } from "../../../../../src/component/resource/appManifest/utils/ManifestUtils";
import { newEnvInfoV3 } from "../../../../../src/core/environment";
import { LocalCrypto } from "../../../../../src/core/crypto";
import { setTools } from "../../../../../src/core/globalVars";
import {
  MockedAzureAccountProvider,
  MockedLogProvider,
  MockedTelemetryReporter,
} from "../../../solution/util";
import { MockedM365TokenProvider, MockUserInteraction } from "../helper";
import { MockTools } from "../../../../core/utils";
import { AppManifest } from "../../../../../src/component/resource/appManifest/appManifest";
import { ComponentNames } from "../../../../../src/component/constants";
import { DefaultManifestProvider } from "../../../../../src/component/resource/appManifest/manifestProvider";
import { getAzureProjectRoot } from "../../../../plugins/resource/appstudio/helper";

describe("Provision Teams app with Azure", () => {
  const sandbox = sinon.createSandbox();

  const appDef: AppDefinition = {
    appName: "fake",
    teamsAppId: uuid(),
    userList: [],
  };

  const projectSettings: ProjectSettings = {
    appName: "fake",
    projectId: uuid(),
  };

  const plugin = Container.get<AppManifest>(ComponentNames.AppManifest);
  let context: v2.Context;
  let inputs: v2.InputsWithProjectPath;
  let mockedTokenProvider: TokenProvider;
  let contextV3: ResourceContextV3;

  beforeEach(async () => {
    const tools = new MockTools();
    setTools(tools);
    inputs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
      appPackagePath: "",
    };

    mockedTokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      m365TokenProvider: new MockedM365TokenProvider(),
    };

    context = {
      userInteraction: new MockUserInteraction(),
      logProvider: new MockedLogProvider(),
      telemetryReporter: new MockedTelemetryReporter(),
      cryptoProvider: new LocalCrypto(projectSettings.projectId),
      projectSetting: projectSettings,
    };

    contextV3 = {
      envInfo: newEnvInfoV3(),
      tokenProvider: mockedTokenProvider,
      userInteraction: new MockUserInteraction(),
      cryptoProvider: new LocalCrypto(projectSettings.projectId),
      projectSetting: projectSettings as ProjectSettingsV3,
      logProvider: new MockedLogProvider(),
      telemetryReporter: new MockedTelemetryReporter(),
      manifestProvider: new DefaultManifestProvider(),
    };

    sandbox.stub(fs, "readFile").callsFake(async () => {
      const zip = new AdmZip();
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(new TeamsAppManifest())));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outlie.png", new Buffer(""));

      const archivedFile = zip.toBuffer();
      return archivedFile;
    });
    sandbox.stub(fs, "ensureDir").callsFake(async () => {});
    sandbox.stub(fs, "writeFile").resolves();
    sandbox.stub(fs, "chmod").resolves();
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("Register Teams app with user provided zip", async () => {
    sandbox.stub<any, any>(fs, "pathExists").resolves(true);
    inputs.appPackagePath = path.join(os.tmpdir(), projectSettings.appName!);
    sandbox.stub(AppStudioClient, "getApp").throws(new Error("404"));
    sandbox.stub(AppStudioClient, "importApp").resolves(appDef);
    const teamsAppId = await plugin.provisionForCLI(
      context,
      inputs,
      newEnvInfoV3(),
      mockedTokenProvider
    );
    chai.assert.isTrue(teamsAppId.isOk());
  });

  it("Register Teams app with user provided zip - file not found", async () => {
    sandbox.stub<any, any>(fs, "pathExists").resolves(false);
    inputs.appPackagePath = path.join(os.tmpdir(), projectSettings.appName!);
    const teamsAppId = await plugin.provisionForCLI(
      context,
      inputs,
      newEnvInfoV3(),
      mockedTokenProvider
    );
    chai.assert.isTrue(teamsAppId.isErr());
    if (teamsAppId.isErr()) {
      chai.assert.equal(teamsAppId.error.name, AppStudioError.FileNotFoundError.name);
    }
  });

  it("Update Teams app with user provided zip", async () => {
    sandbox.stub<any, any>(fs, "pathExists").resolves(true);
    inputs.appPackagePath = path.join(os.tmpdir(), projectSettings.appName!);
    const error = new Error();
    (error.name as any) = 409;
    sandbox.stub(AppStudioClient, "getApp").resolves(appDef);
    sandbox.stub(AppStudioClient, "importApp").resolves(appDef);
    const teamsAppId = await plugin.provisionForCLI(
      context,
      inputs,
      newEnvInfoV3(),
      mockedTokenProvider
    );
    chai.assert.isTrue(teamsAppId.isOk());
  });

  it("Happy path", async () => {
    const appId = uuid();
    contextV3.envInfo.envName = "local";
    contextV3.envInfo.state = {
      solution: {},
      ["app-manifest"]: {},
    };
    contextV3.envInfo.state[ComponentNames.AppManifest].teamsAppId = appId;

    sandbox.stub(AppStudioClient, "getApp").resolves(appDef);
    sandbox.stub<any, any>(fs, "pathExists").resolves(true);

    const manifest = new TeamsAppManifest();
    manifest.id = "";
    manifest.icons.color = "resources/color.png";
    manifest.icons.outline = "resources/outline.png";
    sandbox.stub(manifestUtils, "getManifest").resolves(ok(manifest));

    const res = await plugin.provision(contextV3, inputs);
    chai.assert.isTrue(res.isOk());
  });

  it("Teams app id conflict - provision", async () => {
    const appId = uuid();
    contextV3.envInfo.envName = "local";
    contextV3.envInfo.state = {
      solution: {},
      ["app-manifest"]: {},
    };
    contextV3.envInfo.state[ComponentNames.AppManifest].teamsAppId = appId;

    sandbox.stub(AppStudioClient, "getApp").throws(new Error("404"));
    sandbox.stub(AppStudioClient, "checkExistsInTenant").resolves(true);
    sandbox.stub(AppStudioClient, "importApp").resolves(appDef);
    sandbox.stub<any, any>(fs, "pathExists").resolves(true);

    const manifest = new TeamsAppManifest();
    manifest.id = "";
    manifest.icons.color = "resources/color.png";
    manifest.icons.outline = "resources/outline.png";
    sandbox.stub(manifestUtils, "getManifest").resolves(ok(manifest));

    const res = await plugin.provision(contextV3, inputs);
    chai.assert.isTrue(res.isOk());
  });
});
