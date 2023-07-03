// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Context,
  InputsWithProjectPath,
  Platform,
  TeamsAppManifest,
  ok,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import "mocha";
import sinon from "sinon";
import Container from "typedi";
import * as commonTools from "../../../../src/common/tools";
import { updateManifestV3 } from "../../../../src/component/driver/teamsApp/appStudio";
import { ConfigureTeamsAppDriver } from "../../../../src/component/driver/teamsApp/configure";
import { CreateAppPackageDriver } from "../../../../src/component/driver/teamsApp/createAppPackage";
import { manifestUtils } from "../../../../src/component/driver/teamsApp/utils/ManifestUtils";
import { createContextV3 } from "../../../../src/component/utils";
import { envUtil } from "../../../../src/component/utils/envUtil";
import { setTools } from "../../../../src/core/globalVars";
import { MockLogProvider, MockTools, randomAppName } from "../../../core/utils";
import { getAzureProjectRoot } from "../../../plugins/resource/appstudio/helper";
import { MockedAzureAccountProvider, MockedM365Provider } from "../../../plugins/solution/util";

describe("App-manifest Component - v3", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  const appName = randomAppName();
  const inputs: InputsWithProjectPath = {
    projectPath: getAzureProjectRoot(),
    platform: Platform.VSCode,
    "app-name": appName,
    appPackagePath: "fakePath",
  };
  let context: Context;
  setTools(tools);

  beforeEach(() => {
    context = createContextV3();
    sandbox.stub(tools.tokenProvider.m365TokenProvider, "getAccessToken").resolves(ok("fakeToken"));
    sandbox.stub(tools.tokenProvider.m365TokenProvider, "getJsonObject").resolves(
      ok({
        unique_name: "fakename",
      })
    );

    context.logProvider = new MockLogProvider();
    context.tokenProvider = {
      m365TokenProvider: new MockedM365Provider(),
      azureAccountProvider: new MockedAzureAccountProvider(),
    };

    sandbox.stub(commonTools, "isV3Enabled").returns(true);
    sandbox
      .stub(Container, "get")
      .withArgs(sandbox.match("teamsApp/zipAppPackage"))
      .returns(new CreateAppPackageDriver())
      .withArgs(sandbox.match("teamsApp/update"))
      .returns(new ConfigureTeamsAppDriver());
    sandbox.stub(envUtil, "readEnv").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("deploy - happy path", async function () {
    const manifest = new TeamsAppManifest();
    manifest.id = "";
    manifest.icons.color = "resources/color.png";
    manifest.icons.outline = "resources/outline.png";
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readJSON").resolves(manifest);
    sandbox.stub(fs, "readFile").resolves(new Buffer(JSON.stringify(manifest)));
    sandbox.stub(context.userInteraction, "showMessage").resolves(ok("Preview only"));
    sandbox.stub(ConfigureTeamsAppDriver.prototype, "run").resolves(ok(new Map()));

    await updateManifestV3(context, inputs);
  });

  it("deploy - rebuild", async function () {
    const manifest = new TeamsAppManifest();
    manifest.id = "";
    manifest.icons.color = "resources/color.png";
    manifest.icons.outline = "resources/outline.png";
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
    sandbox.stub(fs, "pathExists").resolves(false);
    sandbox.stub(fs, "readJSON").resolves(manifest);
    sandbox.stub(fs, "readFile").resolves(new Buffer(JSON.stringify(manifest)));
    sandbox.stub(context.userInteraction, "showMessage").resolves(ok("Preview only"));
    sandbox.stub(ConfigureTeamsAppDriver.prototype, "run").resolves(ok(new Map()));
    sandbox.stub(CreateAppPackageDriver.prototype, "run").resolves(ok(new Map()));

    await updateManifestV3(context, inputs);
  });
});
