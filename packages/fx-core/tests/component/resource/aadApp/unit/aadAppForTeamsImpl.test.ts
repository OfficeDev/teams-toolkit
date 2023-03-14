// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as dotenv from "dotenv";
import {
  AzureSolutionSettings,
  ContextV3,
  PluginContext,
  ProjectSettings,
  ProjectSettingsV3,
} from "@microsoft/teamsfx-api";
import { mockProvisionResult, TestHelper, mockSkipFlag, mockTokenProviderM365 } from "../helper";
import sinon from "sinon";
import { getAppStudioToken } from "../tokenProvider";
import faker from "faker";
import { AppUser } from "../../../../../src/component/resource/appManifest/interfaces/appUser";
import * as uuid from "uuid";
import { MockedV2Context } from "../../../../plugins/solution/util";
import * as tool from "../../../../../src/common/tools";
import fs from "fs-extra";
import { AadAppForTeamsImpl } from "../../../../../src/component/resource/aadApp/aadAppForTeamsImpl";
import { AadAppClient } from "../../../../../src/component/resource/aadApp/aadAppClient";
import { ProvisionConfig } from "../../../../../src/component/resource/aadApp/utils/configs";
import { AadAppManifestManager } from "../../../../../src/component/resource/aadApp/aadAppManifestManager";
import { ConfigKeys } from "../../../../../src/component/resource/aadApp/constants";
import { SOLUTION_PROVISION_SUCCEEDED } from "../../../../../src/component/constants";
import mockedEnv, { RestoreFn } from "mocked-env";

dotenv.config();
const testWithAzure: boolean = process.env.UT_TEST_ON_AZURE ? true : false;

const userList: AppUser = {
  tenantId: faker.datatype.uuid(),
  aadId: faker.datatype.uuid(),
  displayName: "displayName",
  userPrincipalName: "userPrincipalName",
  isAdministrator: true,
};
const projectSettings: ProjectSettings = {
  appName: "my app",
  projectId: uuid.v4(),
  solutionSettings: {
    name: "test",
    version: "3.0.0",
    capabilities: ["Tab"],
    hostType: "Azure",
    azureResources: [],
    activeResourcePlugins: [],
  },
};
const ctx = new MockedV2Context(projectSettings) as ContextV3;
describe("AadAppForTeamsPlugin: CI", () => {
  let plugin: AadAppForTeamsImpl;
  let context: PluginContext;
  let mockedEnvRestore: RestoreFn;
  beforeEach(async () => {
    plugin = new AadAppForTeamsImpl();
    sinon.stub(AadAppClient, "createAadApp").resolves();
    sinon.stub(AadAppClient, "createAadAppSecret").resolves();
    sinon.stub(AadAppClient, "updateAadAppRedirectUri").resolves();
    sinon.stub(AadAppClient, "updateAadAppIdUri").resolves();
    sinon.stub(AadAppClient, "updateAadAppPermission").resolves();
    sinon.stub(AadAppClient, "getAadApp").resolves(new ProvisionConfig());
    sinon.stub(AadAppClient, "checkPermission").resolves(true);
    sinon.stub(AadAppClient, "grantPermission").resolves();
    sinon.stub(AadAppClient, "listCollaborator").resolves([
      {
        userObjectId: "id",
        displayName: "displayName",
        userPrincipalName: "userPrincipalName",
        resourceId: "resourceId",
      },
    ]);
  });

  afterEach(() => {
    sinon.restore();
    mockedEnvRestore();
  });

  it("provision: tab", async function () {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    context = await TestHelper.pluginContext(new Map(), true, false, false);
    context.m365TokenProvider = mockTokenProviderM365();

    const provision = await plugin.provision(context);
    chai.assert.isTrue(provision.isOk());

    mockProvisionResult(context);
    const setAppId = plugin.setApplicationInContext(context);
    chai.assert.isTrue(setAppId.isOk());

    const postProvision = await plugin.postProvision(context);
    chai.assert.isTrue(postProvision.isOk());
  });

  it("provision: skip provision", async function () {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    context = await TestHelper.pluginContext(new Map(), true, false, false);
    context.m365TokenProvider = mockTokenProviderM365();
    mockSkipFlag(context);

    const provision = await plugin.provision(context);
    chai.assert.isTrue(provision.isOk());
  });

  it("provision: tab and bot", async function () {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    context = await TestHelper.pluginContext(new Map(), true, true, false);
    context.m365TokenProvider = mockTokenProviderM365();

    const provision = await plugin.provision(context);
    chai.assert.isTrue(provision.isOk());

    mockProvisionResult(context);
    const setAppId = plugin.setApplicationInContext(context);
    chai.assert.isTrue(setAppId.isOk());

    const postProvision = await plugin.postProvision(context);
    chai.assert.isTrue(postProvision.isOk());
  });

  it("provision: none input and fix", async function () {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    context = await TestHelper.pluginContext(new Map(), false, false, false);
    context.m365TokenProvider = mockTokenProviderM365();

    const provision = await plugin.provision(context);
    chai.assert.isTrue(provision.isOk());

    mockProvisionResult(context, false, false);
    let isExceptionThrown = false;
    try {
      const setAppId = plugin.setApplicationInContext(context);
      chai.assert.isTrue(setAppId.isErr());
    } catch (e) {
      isExceptionThrown = true;
    }
    chai.assert.isTrue(isExceptionThrown);

    context = await TestHelper.pluginContext(context.config, true, false, false);
    context.m365TokenProvider = mockTokenProviderM365();

    const provisionSecond = await plugin.provision(context);
    chai.assert.isTrue(provisionSecond.isOk());

    mockProvisionResult(context, false, true);
    const setAppIdSecond = plugin.setApplicationInContext(context);
    chai.assert.isTrue(setAppIdSecond.isOk());

    const postProvision = await plugin.postProvision(context);
    chai.assert.isTrue(postProvision.isOk());
  });

  it("provision: using manifest", async function () {
    sinon.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
    context = await TestHelper.pluginContext(new Map(), true, false, false);
    context.m365TokenProvider = mockTokenProviderM365();
    sinon.stub<any, any>(AadAppManifestManager, "loadAadManifest").resolves({
      id: "",
      name: "fake-aad-name",
      oauth2Permissions: [{ value: "access_as_user" }],
    });
    sinon
      .stub<any, any>(AadAppManifestManager, "createAadApp")
      .resolves({ appId: "fake-appId", id: "fake-object-id" });

    const provision = await plugin.provision(context);
    chai.assert.isTrue(provision.isOk());

    mockProvisionResult(context);
    const setAppId = plugin.setApplicationInContext(context);
    chai.assert.isTrue(setAppId.isOk());

    sinon.stub(AadAppManifestManager, "updateAadApp").resolves();
    const postProvision = await plugin.postProvision(context);
    chai.assert.isTrue(postProvision.isOk());
  });

  it("setApplicationInContext: using manifest", async function () {
    sinon.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
    context = await TestHelper.pluginContext(new Map(), true, true, false);
    context.m365TokenProvider = mockTokenProviderM365();
    mockProvisionResult(context);
    const setAppId = plugin.setApplicationInContext(context);
    chai.assert.isTrue(setAppId.isOk());
    chai.assert.equal(
      context.envInfo.state.get("fx-resource-aad-app-for-teams").frontendEndpoint,
      context.envInfo.state.get("fx-resource-frontend-hosting").endpoint
    );
    chai.assert.equal(
      context.envInfo.state.get("fx-resource-aad-app-for-teams").botId,
      context.envInfo.state.get("fx-resource-bot").botId
    );

    chai.assert.equal(
      context.envInfo.state.get("fx-resource-aad-app-for-teams").botEndpoint,
      context.envInfo.state.get("fx-resource-bot").siteEndpoint
    );
  });

  it("scaffold without bot", async function () {
    sinon.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
    sinon.stub(fs, "ensureDir").resolves();
    const config = new Map();
    const context = await TestHelper.pluginContext(config, true, false, false);
    context.root = "./";

    sinon.stub(fs, "pathExists").resolves(true);

    const fakeManifest = {
      id: "{{state.fx-resource-aad-app-for-teams.objectId}}",
      appId: "{{state.fx-resource-aad-app-for-teams.clientId}}",
      replyUrlsWithType: [
        {
          url: "{{state.fx-resource-aad-app-for-teams.frontendEndpoint}}/auth-end.html",
          type: "Web",
        },
      ],
    };
    sinon.stub(fs, "readJSON").resolves(fakeManifest);
    sinon.stub(fs, "writeJSON").callsFake((file, data, options) => {
      chai.assert.equal(data.replyUrlsWithType.length, 3);
      chai.assert.deepEqual(fakeManifest.replyUrlsWithType[0], data.replyUrlsWithType[0]);
      chai.assert.equal(
        data.replyUrlsWithType[1].url,
        "{{state.fx-resource-aad-app-for-teams.frontendEndpoint}}/auth-end.html?clientId={{state.fx-resource-aad-app-for-teams.clientId}}"
      );
      chai.assert.equal(
        data.replyUrlsWithType[2].url,
        "{{state.fx-resource-aad-app-for-teams.frontendEndpoint}}/blank-auth-end.html"
      );
    });
    const result = await plugin.scaffold(context);
    chai.assert.equal(result.isOk(), true);
  });

  it("scaffold with bot", async function () {
    sinon.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
    sinon.stub(fs, "ensureDir").resolves();
    const config = new Map();
    const context = await TestHelper.pluginContext(config, true, false, false);
    context.root = "./";
    (context.projectSettings!.solutionSettings as any).capabilities.push("Bot");
    (context.projectSettings! as ProjectSettingsV3).components.push({ name: "teams-bot" });
    sinon.stub(fs, "pathExists").resolves(true);

    const fakeManifest = {
      id: "{{state.fx-resource-aad-app-for-teams.objectId}}",
      appId: "{{state.fx-resource-aad-app-for-teams.clientId}}",
      replyUrlsWithType: [
        {
          url: "{{state.fx-resource-aad-app-for-teams.frontendEndpoint}}/auth-end.html",
          type: "Web",
        },
      ],
    };
    sinon.stub(fs, "readJSON").resolves(fakeManifest);
    sinon.stub(fs, "writeJSON").callsFake((file, data, options) => {
      chai.assert.equal(data.replyUrlsWithType.length, 4);
      chai.assert.deepEqual(fakeManifest.replyUrlsWithType[0], data.replyUrlsWithType[0]);
      chai.assert.equal(
        data.replyUrlsWithType[1].url,
        "{{state.fx-resource-aad-app-for-teams.frontendEndpoint}}/auth-end.html?clientId={{state.fx-resource-aad-app-for-teams.clientId}}"
      );
      chai.assert.equal(
        data.replyUrlsWithType[2].url,
        "{{state.fx-resource-aad-app-for-teams.frontendEndpoint}}/blank-auth-end.html"
      );
      chai.assert.equal(
        data.replyUrlsWithType[3].url,
        "{{state.fx-resource-aad-app-for-teams.botEndpoint}}/auth-end.html"
      );
    });
    const result = await plugin.scaffold(context);
    chai.assert.equal(result.isOk(), true);
  });

  it("scaffold with bot for vs", async function () {
    sinon.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
    sinon.stub(fs, "ensureDir").resolves();
    const config = new Map();
    const context = await TestHelper.pluginContext(config, true, false, false);
    context.root = "./";
    context.projectSettings!.programmingLanguage = "csharp";
    (context.projectSettings!.solutionSettings as AzureSolutionSettings).capabilities = ["Bot"];
    (context.projectSettings! as ProjectSettingsV3).components = [{ name: "teams-bot" }];
    sinon.stub(fs, "pathExists").resolves(true);

    const fakeManifest = {
      id: "{{state.fx-resource-aad-app-for-teams.objectId}}",
      appId: "{{state.fx-resource-aad-app-for-teams.clientId}}",
    };
    sinon.stub(fs, "readJSON").resolves(fakeManifest);
    sinon.stub(fs, "writeJSON").callsFake((file, data, options) => {
      chai.assert.equal(data.replyUrlsWithType.length, 1);
      chai.assert.deepEqual(
        "{{state.fx-resource-aad-app-for-teams.botEndpoint}}/bot-auth-end.html",
        data.replyUrlsWithType[0].url
      );
    });
    const result = await plugin.scaffold(context);
    chai.assert.equal(result.isOk(), true);
  });

  it("deploy", async function () {
    sinon.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
    sinon.stub<any, any>(AadAppManifestManager, "loadAadManifest").resolves({
      id: "fake-aad-id",
      name: "fake-aad-name",
      replyUrlsWithType: [{ url: "fake-url", type: "Web" }],
      identifierUris: ["fake-identifier-uri"],
    });
    sinon.stub(AadAppManifestManager, "updateAadApp").resolves();
    sinon.stub(fs, "ensureDir").resolves();
    sinon.stub(fs, "writeFile").resolves();

    const config = new Map();
    const context = await TestHelper.pluginContext(config, true, false, false);

    context.envInfo.state.get("solution").set(SOLUTION_PROVISION_SUCCEEDED, true);
    context.m365TokenProvider = mockTokenProviderM365();
    await plugin.deploy(context);
  });
});

describe("AadAppForTeamsPlugin: Azure", () => {
  let plugin: AadAppForTeamsImpl;
  let context: PluginContext;
  let appStudioToken: string | undefined;
  let graphToken: string | undefined;

  before(async function () {
    if (!testWithAzure) {
      this.skip();
    }

    appStudioToken = await getAppStudioToken();
    chai.assert.isString(appStudioToken);
  });

  beforeEach(() => {
    plugin = new AadAppForTeamsImpl();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("provision: tab and bot with context changes", async function () {
    context = await TestHelper.pluginContext(new Map(), true, true, false);
    context.m365TokenProvider = mockTokenProviderM365();
    const provision = await plugin.provision(context);
    chai.assert.isTrue(provision.isOk());

    const setAppId = plugin.setApplicationInContext(context);
    chai.assert.isTrue(setAppId.isOk());

    const postProvision = await plugin.postProvision(context);
    chai.assert.isTrue(postProvision.isOk());

    // Remove clientId and oauth2PermissionScopeId.
    context.config.set(ConfigKeys.clientId, "");
    context.config.set(ConfigKeys.oauth2PermissionScopeId, "");

    const provisionSecond = await plugin.provision(context);
    chai.assert.isTrue(provisionSecond.isOk());

    const setAppIdSecond = plugin.setApplicationInContext(context);
    chai.assert.isTrue(setAppIdSecond.isOk());

    const postProvisionSecond = await plugin.postProvision(context);
    chai.assert.isTrue(postProvisionSecond.isOk());

    // Remove objectId.
    // Create a new context with same context.config since error will occur with same endpoint and botId.
    context.config.set(ConfigKeys.objectId, "");
    context = await TestHelper.pluginContext(context.config, true, true);
    context.m365TokenProvider = mockTokenProviderM365();

    const provisionThird = await plugin.provision(context);
    chai.assert.isTrue(provisionThird.isOk());

    const setAppIdThird = plugin.setApplicationInContext(context);
    chai.assert.isTrue(setAppIdThird.isOk());

    const postProvisionThird = await plugin.postProvision(context);
    chai.assert.isTrue(postProvisionThird.isOk());
  });
});
