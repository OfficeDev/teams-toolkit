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
import {
  ProjectSettings,
  v2,
  Platform,
  TokenProvider,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import { AppStudioClient } from "./../../../../../src/plugins/resource/appstudio/appStudio";
import { Constants } from "../../../../../src/plugins/resource/appstudio/constants";
import { AppDefinition } from "./../../../../../src/plugins/resource/appstudio/interfaces/appDefinition";
import { newEnvInfoV3 } from "../../../../../src";
import { LocalCrypto } from "../../../../../src/core/crypto";
import {
  MockedAzureAccountProvider,
  MockedLogProvider,
  MockedTelemetryReporter,
} from "../../../solution/util";
import { MockedM365TokenProvider, MockUserInteraction } from "../helper";
import { AppManifest } from "../../../../../src/component/resource/appManifest/appManifest";
import { ComponentNames } from "../../../../../src/component/constants";
import Container from "typedi";

describe("Provision Teams app with Azure", () => {
  const sandbox = sinon.createSandbox();

  const appDef: AppDefinition = {
    appName: "fake",
    teamsAppId: uuid(),
    userList: [],
  };

  const plugin = Container.get<AppManifest>(ComponentNames.AppManifest);
  let context: v2.Context;
  let inputs: v2.InputsWithProjectPath;
  let mockedTokenProvider: TokenProvider;

  beforeEach(async () => {
    const projectSettings: ProjectSettings = {
      appName: "fake",
      projectId: uuid(),
    };

    inputs = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), projectSettings.appName),
      appPackagePath: path.join(os.tmpdir(), projectSettings.appName),
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

    sandbox.stub<any, any>(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").callsFake(async () => {
      const zip = new AdmZip();
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(new TeamsAppManifest())));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outlie.png", new Buffer(""));

      const archivedFile = zip.toBuffer();
      return archivedFile;
    });
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("Register Teams app with user provided zip", async () => {
    sandbox.stub(AppStudioClient, "importApp").resolves(appDef);
    const teamsAppId = await plugin.provisionForCLI(
      context,
      inputs,
      newEnvInfoV3(),
      mockedTokenProvider
    );
    chai.assert.isTrue(teamsAppId.isOk());
  });

  it("Update Teams app with user provided zip", async () => {
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
});
