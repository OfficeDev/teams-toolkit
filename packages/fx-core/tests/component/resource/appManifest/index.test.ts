// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import path from "path";
import * as os from "os";
import fs from "fs-extra";
import {
  ContextV3,
  InputsWithProjectPath,
  Platform,
  ResourceContextV3,
  TeamsAppManifest,
  ok,
} from "@microsoft/teamsfx-api";
import { randomAppName, MockLogProvider, MockTools } from "../../../core/utils";
import { createContextV3 } from "../../../../src/component/utils";
import { setTools } from "../../../../src/core/globalVars";
import { AppManifest } from "../../../../src/component/resource/appManifest/appManifest";
import { AppStudioError } from "../../../../src/plugins/resource/appstudio/errors";
import { newEnvInfoV3 } from "../../../../src";
import { ComponentNames } from "../../../../src/component/constants";
import { AppStudioClient } from "../../../../src/plugins/resource/appstudio/appStudio";
import * as appstudio from "../../../../src/component/resource/appManifest/appStudio";
import * as utils from "../../../../src/component/resource/appManifest/utils";

describe("App-manifest Component", () => {
  const sandbox = sinon.createSandbox();
  const component = new AppManifest();
  const tools = new MockTools();
  const appName = randomAppName();
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const inputs: InputsWithProjectPath = {
    projectPath: projectPath,
    platform: Platform.VSCode,
    "app-name": appName,
    appPackagePath: "fakePath",
  };
  let context: ContextV3;
  setTools(tools);

  beforeEach(() => {
    context = createContextV3();
    context.envInfo = newEnvInfoV3();
    context.envInfo!.state["solution"] = {
      ["provisionSucceed"]: true,
    };
    context.envInfo!.state[ComponentNames.AppManifest] = {
      ["teamsAppUpdatedAt"]: undefined,
    };
    sandbox.stub(tools.tokenProvider.m365TokenProvider, "getAccessToken").resolves(ok("fakeToken"));
    context.logProvider = new MockLogProvider();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("validate manifest", async function () {
    sandbox.stub(appstudio, "getManifest").resolves(ok(new TeamsAppManifest()));
    const validationAction = await component.validate(context as ResourceContextV3, inputs);
    chai.assert.isTrue(validationAction.isOk());
  });

  it("deploy - filenotfound", async function () {
    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    chai.assert.isTrue(deployAction.isErr());
    if (deployAction.isErr()) {
      chai.assert.equal(deployAction.error.name, AppStudioError.FileNotFoundError.name);
    }
  });

  it("deploy - preivew only", async function () {
    const manifest = new TeamsAppManifest();
    sandbox.stub(utils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readJSON").resolves(manifest);
    sandbox.stub(fs, "readFile").resolves(new Buffer(JSON.stringify(manifest)));
    sandbox.stub(context.userInteraction, "showMessage").resolves(ok("Preview only"));

    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    chai.assert.isTrue(deployAction.isErr());
    if (deployAction.isErr()) {
      chai.assert.equal(deployAction.error.name, AppStudioError.UpdateManifestCancelError.name);
    }
  });

  it("deploy - succeed", async function () {
    const manifest = new TeamsAppManifest();
    sandbox.stub(utils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readJSON").resolves(manifest);
    sandbox.stub(fs, "readFile").resolves(new Buffer(JSON.stringify(manifest)));
    sandbox.stub(context.userInteraction, "showMessage").resolves(ok("Preview and update"));
    sandbox.stub(AppStudioClient, "importApp").resolves({ teamsAppId: "mockTeamsAppId" });

    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    chai.assert.isTrue(deployAction.isOk());
  });
});
