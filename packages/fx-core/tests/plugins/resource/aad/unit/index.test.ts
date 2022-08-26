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
  TokenProvider,
  v3,
} from "@microsoft/teamsfx-api";
import { AadAppForTeamsPlugin } from "../../../../../src/plugins/resource/aad/index";
import { mockProvisionResult, TestHelper, mockSkipFlag, mockTokenProviderM365 } from "../helper";
import sinon from "sinon";
import { AadAppClient } from "../../../../../src/plugins/resource/aad/aadAppClient";
import { getAppStudioToken } from "../tokenProvider";
import { ConfigKeys } from "../../../../../src/plugins/resource/aad/constants";
import { ProvisionConfig } from "../../../../../src/plugins/resource/aad/utils/configs";
import faker from "faker";
import { AppUser } from "../../../../../src/plugins/resource/appstudio/interfaces/appUser";
import { AadAppForTeamsPluginV3 } from "../../../../../src/plugins/resource/aad/v3";
import {
  BuiltInFeaturePluginNames,
  BuiltInSolutionNames,
} from "../../../../../src/plugins/solution/fx-solution/v3/constants";
import { Container } from "typedi";
import * as uuid from "uuid";
import {
  MockedAzureAccountProvider,
  MockedM365Provider,
  MockedV2Context,
} from "../../../solution/util";
import * as tool from "../../../../../src/common/tools";
import fs from "fs-extra";
import { AadAppManifestManager } from "../../../../../src/plugins/resource/aad/aadAppManifestManager";
import { ComponentNames } from "../../../../../src/component/constants";

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
    name: BuiltInSolutionNames.azure,
    version: "3.0.0",
    capabilities: ["Tab"],
    hostType: "Azure",
    azureResources: [],
    activeResourcePlugins: [],
  },
};
const ctx = new MockedV2Context(projectSettings) as ContextV3;
const tokenProvider: TokenProvider = {
  azureAccountProvider: new MockedAzureAccountProvider(),
  m365TokenProvider: new MockedM365Provider(),
};
describe("AadAppForTeamsPlugin: CI", () => {
  let plugin: AadAppForTeamsPlugin;
  let context: PluginContext;

  beforeEach(async () => {
    plugin = new AadAppForTeamsPlugin();
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
  });

  it("provision: tab", async function () {
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
    context = await TestHelper.pluginContext(new Map(), true, false, false);
    context.m365TokenProvider = mockTokenProviderM365();
    mockSkipFlag(context);

    const provision = await plugin.provision(context);
    chai.assert.isTrue(provision.isOk());
  });

  it("provision: tab and bot", async function () {
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
    context = await TestHelper.pluginContext(new Map(), false, false, false);
    context.m365TokenProvider = mockTokenProviderM365();

    const provision = await plugin.provision(context);
    chai.assert.isTrue(provision.isOk());

    mockProvisionResult(context, false, false);
    const setAppId = plugin.setApplicationInContext(context);
    chai.assert.isTrue(setAppId.isErr());

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

  it("local debug: tab and bot", async function () {
    context = await TestHelper.pluginContext(new Map(), true, true, true);
    context.m365TokenProvider = mockTokenProviderM365();

    const provision = await plugin.localDebug(context);
    chai.assert.isTrue(provision.isOk());

    mockProvisionResult(context, true);
    const setAppId = plugin.setApplicationInContext(context, true);
    chai.assert.isTrue(setAppId.isOk());

    const postProvision = await plugin.postLocalDebug(context);
    chai.assert.isTrue(postProvision.isOk());
  });

  it("local debug: skip local debug", async function () {
    context = await TestHelper.pluginContext(new Map(), true, false, true);
    context.m365TokenProvider = mockTokenProviderM365();
    mockSkipFlag(context, true);

    const localDebug = await plugin.localDebug(context);
    chai.assert.isTrue(localDebug.isOk());
  });

  it("check permission", async function () {
    const config = new Map();
    config.set(ConfigKeys.objectId, faker.datatype.uuid());
    context = await TestHelper.pluginContext(config, true, false, false);
    context.m365TokenProvider = mockTokenProviderM365();

    const checkPermission = await plugin.checkPermission(context, userList);
    chai.assert.isTrue(checkPermission.isOk());
  });

  it("check permission V3", async function () {
    ctx.projectSetting.components = [
      {
        name: "teams-app",
        hosting: "azure-storage",
        sso: true,
      },
      {
        name: "aad-app",
        provision: true,
      },
      {
        name: "identity",
        provision: true,
      },
    ];
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: {
        solution: { provisionSucceeded: true },
        [ComponentNames.AppManifest]: { tenantId: "mock_project_tenant_id" },
        [ComponentNames.AadApp]: { objectId: faker.datatype.uuid() },
      },
      config: {},
    };
    const plugin = Container.get<AadAppForTeamsPluginV3>(BuiltInFeaturePluginNames.aad);
    const res = await plugin.checkPermission(ctx, envInfo, tokenProvider, userList);
    chai.assert.isTrue(res.isOk());
  });

  it("grant permission", async function () {
    const config = new Map();
    config.set(ConfigKeys.objectId, faker.datatype.uuid());
    context = await TestHelper.pluginContext(config, true, false, false);
    context.m365TokenProvider = mockTokenProviderM365();

    const grantPermission = await plugin.grantPermission(context, userList);
    chai.assert.isTrue(grantPermission.isOk());
  });

  it("grant permission V3", async function () {
    ctx.projectSetting.components = [
      {
        name: "teams-app",
        hosting: "azure-storage",
        sso: true,
      },
      {
        name: "aad-app",
        provision: true,
      },
      {
        name: "identity",
        provision: true,
      },
    ];
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: {
        solution: { provisionSucceeded: true },
        [ComponentNames.AppManifest]: { tenantId: "mock_project_tenant_id" },
        [ComponentNames.AadApp]: { objectId: faker.datatype.uuid() },
      },
      config: {},
    };
    const plugin = Container.get<AadAppForTeamsPluginV3>(BuiltInFeaturePluginNames.aad);
    const res = await plugin.grantPermission(ctx, envInfo, tokenProvider, userList);
    chai.assert.isTrue(res.isOk());
  });

  it("list collaborator", async function () {
    const config = new Map();
    config.set(ConfigKeys.objectId, faker.datatype.uuid());
    context = await TestHelper.pluginContext(config, true, false, false);
    context.m365TokenProvider = mockTokenProviderM365();
    mockProvisionResult(context, false);

    const listCollaborator = await plugin.listCollaborator(context);
    chai.assert.isTrue(listCollaborator.isOk());
    if (listCollaborator.isOk()) {
      chai.assert.equal(listCollaborator.value[0].userObjectId, "id");
    }
  });

  it("list collaborator V3", async function () {
    ctx.projectSetting.components = [
      {
        name: "teams-app",
        hosting: "azure-storage",
        sso: true,
      },
      {
        name: "aad-app",
        provision: true,
      },
      {
        name: "identity",
        provision: true,
      },
    ];
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: {
        solution: { provisionSucceeded: true },
        [ComponentNames.AppManifest]: { tenantId: "mock_project_tenant_id" },
        [ComponentNames.AadApp]: { objectId: faker.datatype.uuid() },
      },
      config: {},
    };
    const plugin = Container.get<AadAppForTeamsPluginV3>(BuiltInFeaturePluginNames.aad);
    const res = await plugin.listCollaborator(ctx, envInfo, tokenProvider);
    chai.assert.isTrue(res.isOk());
    if (res.isOk()) {
      chai.assert.equal(res.value[0].userObjectId, "id");
    }
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
    context.m365TokenProvider = mockTokenProviderM365();
    await plugin.deploy(context);
  });
});

describe("AadAppForTeamsPlugin: Azure", () => {
  let plugin: AadAppForTeamsPlugin;
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
    plugin = new AadAppForTeamsPlugin();
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
