// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Context,
  InputsWithProjectPath,
  Platform,
  TeamsAppManifest,
  ok,
} from "@microsoft/teamsfx-api";
import * as chai from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import sinon from "sinon";
import Container from "typedi";
import { FeatureFlagName } from "../../../../src/common/constants";
import * as commonTools from "../../../../src/common/tools";
import { updateManifestV3 } from "../../../../src/component/driver/teamsApp/appStudio";
import { AppStudioClient } from "../../../../src/component/driver/teamsApp/clients/appStudioClient";
import { ConfigureTeamsAppDriver } from "../../../../src/component/driver/teamsApp/configure";
import { Constants } from "../../../../src/component/driver/teamsApp/constants";
import { CreateAppPackageDriver } from "../../../../src/component/driver/teamsApp/createAppPackage";
import { manifestUtils } from "../../../../src/component/driver/teamsApp/utils/ManifestUtils";
import { AppManifest } from "../../../../src/component/resource/appManifest/appManifest";
import { createContextV3 } from "../../../../src/component/utils";
import { envUtil } from "../../../../src/component/utils/envUtil";
import { setTools } from "../../../../src/core/globalVars";
import { MockLogProvider, MockTools, randomAppName } from "../../../core/utils";
import { getAzureProjectRoot } from "../../../plugins/resource/appstudio/helper";
import { MockedAzureAccountProvider, MockedM365Provider } from "../../../plugins/solution/util";
import { newEnvInfoV3 } from "../../../helpers";

describe("App-manifest Component", () => {
  const sandbox = sinon.createSandbox();
  const component = new AppManifest();
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
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("collaboration v3", () => {
    let mockedEnvRestore: RestoreFn;
    before(() => {
      mockedEnvRestore = mockedEnv({
        [FeatureFlagName.V3]: "true",
      });
    });
    afterEach(() => {
      sandbox.restore();
    });
    after(() => {
      sandbox.restore();
      mockedEnvRestore();
    });

    it("listCollaborator v3 - succeed", async function () {
      sandbox
        .stub(AppStudioClient, "getUserList")
        .callsFake(async (teamsAppId: string, appStudioToken: string) => {
          return [
            {
              tenantId: "tenantId",
              aadId: teamsAppId,
              displayName: "displayName",
              userPrincipalName: "userPrincipalName",
              isAdministrator: true,
            },
          ];
        });

      const envInfo = newEnvInfoV3();
      envInfo.envName = "local";
      envInfo.state = {
        solution: {},
      };

      const result = await component.listCollaborator(
        context,
        inputs,
        envInfo,
        tools.tokenProvider.m365TokenProvider,
        "teamsAppId"
      );
      chai.assert.isTrue(result.isOk());
      if (result.isOk()) {
        chai.assert.equal(result.value[0].userObjectId, "teamsAppId");
      }
    });

    it("grantPermission v3 - succeed", async function () {
      sandbox.stub(AppStudioClient, "grantPermission").resolves();
      const envInfo = newEnvInfoV3();
      envInfo.envName = "local";
      envInfo.state = {
        solution: {},
      };

      const userList = {
        tenantId: "tenantId",
        aadId: "aadId",
        displayName: "displayName",
        userPrincipalName: "userPrincipalName",
        isAdministrator: true,
      };

      const result = await component.grantPermission(
        context,
        inputs,
        envInfo,
        tools.tokenProvider.m365TokenProvider,
        userList,
        "teamsAppId"
      );
      chai.assert.isTrue(result.isOk());
    });

    it("checkPermission v3 - succeed", async function () {
      sandbox.stub(AppStudioClient, "checkPermission").resolves(Constants.PERMISSIONS.admin);
      const envInfo = newEnvInfoV3();
      envInfo.envName = "local";
      envInfo.state = {
        solution: {},
      };

      const userList = {
        tenantId: "tenantId",
        aadId: "aadId",
        displayName: "displayName",
        userPrincipalName: "userPrincipalName",
        isAdministrator: true,
      };

      const result = await component.checkPermission(
        context,
        inputs,
        envInfo,
        tools.tokenProvider.m365TokenProvider,
        userList,
        "teamsAppId"
      );
      chai.assert.isTrue(result.isOk());
    });
  });
});

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
