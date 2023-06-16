// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import fs from "fs-extra";
import _ from "lodash";
import {
  Context,
  InputsWithProjectPath,
  Platform,
  TeamsAppManifest,
  ok,
} from "@microsoft/teamsfx-api";
import Container from "typedi";
import { randomAppName, MockLogProvider, MockTools } from "../../../core/utils";
import { MockedM365Provider, MockedAzureAccountProvider } from "../../../plugins/solution/util";
import { createContextV3 } from "../../../../src/component/utils";
import { setTools } from "../../../../src/core/globalVars";
import { AppManifest } from "../../../../src/component/resource/appManifest/appManifest";
import { ComponentNames } from "../../../../src/component/constants";
import { AppStudioClient } from "../../../../src/component/driver/teamsApp/clients/appStudioClient";
import { updateManifestV3 } from "../../../../src/component/driver/teamsApp/appStudio";
import { Constants } from "../../../../src/component/driver/teamsApp/constants";
import { getAzureProjectRoot } from "../../../plugins/resource/appstudio/helper";
import { manifestUtils } from "../../../../src/component/driver/teamsApp/utils/ManifestUtils";
import * as uuid from "uuid";
import { newEnvInfoV3 } from "../../../../src/core/environment";
import { AppDefinition } from "../../../../src/component/driver/teamsApp/interfaces/appdefinitions/appDefinition";
import mockedEnv, { RestoreFn } from "mocked-env";
import { FeatureFlagName } from "../../../../src/common/constants";
import * as commonTools from "../../../../src/common/tools";
import { CreateAppPackageDriver } from "../../../../src/component/driver/teamsApp/createAppPackage";
import { ConfigureTeamsAppDriver } from "../../../../src/component/driver/teamsApp/configure";
import { envUtil } from "../../../../src/component/utils/envUtil";

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

  it("getManifest(tab) - happy path", async function () {
    const manifestString = `{
      "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
      "manifestVersion": "1.14",
      "version": "1.0.0",
      "id": "{{state.app-manifest.teamsAppId}}",
      "packageName": "com.microsoft.teams.extension",
      "developer": {
          "name": "Teams App, Inc.",
          "websiteUrl": "https://www.example.com",
          "privacyUrl": "https://www.example.com/termofuse",
          "termsOfUseUrl": "https://www.example.com/privacy"
      },
      "icons": {
          "color": "{{config.manifest.icons.color}}",
          "outline": "{{config.manifest.icons.outline}}"
      },
      "name": {
          "short": "{{config.manifest.appName.short}}",
          "full": "{{config.manifest.appName.full}}"
      },
      "description": {
          "short": "{{config.manifest.description.short}}",
          "full": "{{config.manifest.description.full}}"
      },
      "accentColor": "#FFFFFF",
      "bots": [],
      "composeExtensions": [],
      "staticTabs": [
          {
              "entityId": "index0",
              "name": "Personal Tab",
              "contentUrl": "{{{state.teams-tab.endpoint}}}{{{state.teams-tab.indexPath}}}/tab",
              "websiteUrl": "{{{state.teams-tab.endpoint}}}{{{state.teams-tab.indexPath}}}/tab",
              "scopes": [
                  "personal"
              ]
          }
      ],
      "permissions": [
          "identity",
          "messageTeamMembers"
      ],
      "validDomains": [
          "{{state.teams-tab.domain}}"
      ],
      "webApplicationInfo": {
          "id": "{{state.aad-app.clientId}}",
          "resource": "{{{state.aad-app.applicationIdUris}}}"
      }
    }`;
    sandbox.stub(fs, "readFile").resolves(manifestString as any);
    sandbox.stub(fs, "pathExists").resolves(true);
    const envInfo = newEnvInfoV3();
    envInfo.envName = "local";
    context.tokenProvider = tools.tokenProvider;
    envInfo.state = {
      solution: {
        provisionSucceeded: true,
        teamsAppTenantId: "zzzzzz-zzzzzz-zzzzz",
      },
      "app-manifest": {
        tenantId: "xxxxxxxxx-xxxxxxx-xxxxxxx",
        teamsAppId: "yyyyyyy-yyyyyyy-yyyyyyy",
      },
      "teams-tab": {
        indexPath: "/index.html#",
        endpoint: "https://localhost:53000",
        domain: "localhost",
      },
      "aad-app": {
        clientId: "aaaaaaaaaaa-aaaaaaaaaaa-aaaaaaaa",
        applicationIdUris: "https://aas-bcc",
      },
    };
    const getManifestRes = await manifestUtils.getManifest("", envInfo, false);
    chai.assert(getManifestRes.isOk());
    if (getManifestRes.isOk()) {
      const finalManifest = getManifestRes.value;
      chai.assert(finalManifest.validDomains?.includes("localhost:53000"));
    }
  });

  it("getManifest(tab+bot) - error", async function () {
    const manifestString = `{
      "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
      "manifestVersion": "1.14",
      "version": "1.0.0",
      "id": "{{state.app-manifest.teamsAppId}}",
      "packageName": "com.microsoft.teams.extension",
      "developer": {
          "name": "Teams App, Inc.",
          "websiteUrl": "https://www.example.com",
          "privacyUrl": "https://www.example.com/termofuse",
          "termsOfUseUrl": "https://www.example.com/privacy"
      },
      "icons": {
          "color": "{{config.manifest.icons.color}}",
          "outline": "{{config.manifest.icons.outline}}"
      },
      "name": {
          "short": "{{config.manifest.appName.short}}",
          "full": "{{config.manifest.appName.full}}"
      },
      "description": {
          "short": "{{config.manifest.description.short}}",
          "full": "{{config.manifest.description.full}}"
      },
      "accentColor": "#FFFFFF",
      "bots": [],
      "composeExtensions": [],
      "staticTabs": [
          {
              "entityId": "index0",
              "name": "Personal Tab",
              "contentUrl": "{{{state.teams-tab.endpoint}}}{{{state.teams-tab.indexPath}}}/tab",
              "websiteUrl": "{{{state.teams-tab.endpoint}}}{{{state.teams-tab.indexPath}}}/tab",
              "scopes": [
                  "personal"
              ]
          }
      ],
      "permissions": [
          "identity",
          "messageTeamMembers"
      ],
      "validDomains": [
          "{{state.teams-tab.domain}}"
      ],
      "webApplicationInfo": {
          "id": "{{state.aad-app.clientId}}",
          "resource": "{{{state.aad-app.applicationIdUris}}}"
      }
    }`;
    sandbox.stub(fs, "readFile").resolves(manifestString as any);
    sandbox.stub(fs, "pathExists").resolves(true);
    const envInfo = newEnvInfoV3();
    envInfo.envName = "local";
    context.tokenProvider = tools.tokenProvider;
    envInfo.state = {
      solution: {
        provisionSucceeded: true,
        teamsAppTenantId: "zzzzzz-zzzzzz-zzzzz",
      },
      "app-manifest": {
        tenantId: "xxxxxxxxx-xxxxxxx-xxxxxxx",
        teamsAppId: "yyyyyyy-yyyyyyy-yyyyyyy",
      },
      "teams-tab": {
        indexPath: "/index.html#",
        endpoint: "https://localhost:53000",
        domain: "localhost",
      },
      "aad-app": {
        clientId: "aaaaaaaaaaa-aaaaaaaaaaa-aaaaaaaa",
        applicationIdUris: "https://aas-bcc",
      },
      "teams-bot": {
        botId: "bbbbcccccc",
      },
    };
    const getManifestRes = await manifestUtils.getManifest("", envInfo, false);
    chai.assert(getManifestRes.isErr());
  });

  it("getManifest(tab+bot) - happy path", async function () {
    const manifestString = `{
      "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
      "manifestVersion": "1.14",
      "version": "1.0.0",
      "id": "{{state.app-manifest.teamsAppId}}",
      "packageName": "com.microsoft.teams.extension",
      "developer": {
          "name": "Teams App, Inc.",
          "websiteUrl": "https://www.example.com",
          "privacyUrl": "https://www.example.com/termofuse",
          "termsOfUseUrl": "https://www.example.com/privacy"
      },
      "icons": {
          "color": "{{config.manifest.icons.color}}",
          "outline": "{{config.manifest.icons.outline}}"
      },
      "name": {
          "short": "{{config.manifest.appName.short}}",
          "full": "{{config.manifest.appName.full}}"
      },
      "description": {
          "short": "{{config.manifest.description.short}}",
          "full": "{{config.manifest.description.full}}"
      },
      "accentColor": "#FFFFFF",
      "bots": [],
      "composeExtensions": [],
      "staticTabs": [
          {
              "entityId": "index0",
              "name": "Personal Tab",
              "contentUrl": "{{{state.teams-tab.endpoint}}}{{{state.teams-tab.indexPath}}}/tab",
              "websiteUrl": "{{{state.teams-tab.endpoint}}}{{{state.teams-tab.indexPath}}}/tab",
              "scopes": [
                  "personal"
              ]
          }
      ],
      "permissions": [
          "identity",
          "messageTeamMembers"
      ],
      "validDomains": [
      ],
      "webApplicationInfo": {
          "id": "{{state.aad-app.clientId}}",
          "resource": "{{{state.aad-app.applicationIdUris}}}"
      }
    }`;
    sandbox.stub(fs, "readFile").resolves(manifestString as any);
    sandbox.stub(fs, "pathExists").resolves(true);
    const envInfo = newEnvInfoV3();
    envInfo.envName = "local";
    context.tokenProvider = tools.tokenProvider;
    envInfo.state = {
      solution: {
        provisionSucceeded: true,
        teamsAppTenantId: "zzzzzz-zzzzzz-zzzzz",
      },
      "app-manifest": {
        tenantId: "xxxxxxxxx-xxxxxxx-xxxxxxx",
        teamsAppId: "yyyyyyy-yyyyyyy-yyyyyyy",
      },
      "teams-tab": {
        indexPath: "/index.html#",
        endpoint: "https://localhost:53000",
        domain: "localhost",
      },
      "aad-app": {
        clientId: "aaaaaaaaaaa-aaaaaaaaaaa-aaaaaaaa",
        applicationIdUris: "https://aas-bcc",
      },
      "teams-bot": {
        botId: "bbbbcccccc",
        validDomain: "abc.com",
      },
    };
    const getManifestRes = await manifestUtils.getManifest("", envInfo, false);
    chai.assert(getManifestRes.isOk());
    if (getManifestRes.isOk()) {
      const finalManifest = getManifestRes.value;
      chai.assert(finalManifest.validDomains?.includes("abc.com"));
    }
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
