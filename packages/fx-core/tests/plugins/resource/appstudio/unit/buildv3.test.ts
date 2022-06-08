// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import { v4 as uuid } from "uuid";
import { v2, v3, ProjectSettings, Platform } from "@microsoft/teamsfx-api";
import { newEnvInfoV3 } from "../../../../../src";
import { LocalCrypto } from "../../../../../src/core/crypto";
import { MockedLogProvider, MockedTelemetryReporter } from "../../../solution/util";
import { MockUserInteraction, getAzureProjectRoot } from "../helper";
import { buildTeamsAppPackage } from "../../../../../src/component/resource/appManifest/appStudio";

describe("Build Teams Package", () => {
  const sandbox = sinon.createSandbox();

  let context: v2.Context;
  let inputs: v2.InputsWithProjectPath;
  let envInfo: v3.EnvInfoV3;

  beforeEach(async () => {
    const projectSettings: ProjectSettings = {
      appName: "fake",
      projectId: uuid(),
    };
    context = {
      userInteraction: new MockUserInteraction(),
      logProvider: new MockedLogProvider(),
      telemetryReporter: new MockedTelemetryReporter(),
      cryptoProvider: new LocalCrypto(projectSettings.projectId),
      projectSetting: projectSettings,
    };

    inputs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
    };

    envInfo = newEnvInfoV3();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("Build Teams app package", async () => {
    const zipFile = await buildTeamsAppPackage(inputs.projectPath, envInfo);
    chai.assert.isTrue(zipFile.isOk());
  });
});
