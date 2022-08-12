// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import path from "path";
import * as os from "os";
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
import * as AppStudio from "../../../../src/component/resource/appManifest/appStudio";
import { AppStudioError } from "../../../../src/plugins/resource/appstudio/errors";
import { newEnvInfoV3 } from "../../../../src";

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
  };
  let context: ContextV3;
  setTools(tools);

  beforeEach(() => {
    context = createContextV3();
    context.envInfo = newEnvInfoV3();
    context.envInfo!.state["solution"] = {
      ["provisionSucceed"]: true,
    };
    context.logProvider = new MockLogProvider();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("validate manifest", async function () {
    sandbox.stub(AppStudio, "getManifest").resolves(ok(new TeamsAppManifest()));
    const validationAction = await component.validate(context as ResourceContextV3, inputs);
    chai.assert.isTrue(validationAction.isOk());
  });

  it("deploy - filenotfound", async function () {
    sandbox.stub(AppStudio, "getManifest").resolves(ok(new TeamsAppManifest()));
    const deployAction = await component.deploy(context as ResourceContextV3, inputs);
    chai.assert.isTrue(deployAction.isErr());
    if (deployAction.isErr()) {
      chai.assert.equal(deployAction.error.name, AppStudioError.FileNotFoundError.name);
    }
  });
});
