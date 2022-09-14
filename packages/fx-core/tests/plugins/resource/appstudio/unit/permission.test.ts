// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import { AppStudioPlugin } from "../../../../../src/plugins/resource/appstudio";
import {
  ConfigMap,
  ok,
  Platform,
  PluginContext,
  ProjectSettings,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { Constants } from "../../../../../src/plugins/resource/appstudio/constants";
import faker from "faker";
import { PluginNames } from "../../../../../src/plugins/solution/fx-solution/constants";
import { AppStudioClient } from "./../../../../../src/plugins/resource/appstudio/appStudio";
import { getAzureProjectRoot } from "../helper";
import { AppUser } from "../../../../../src/plugins/resource/appstudio/interfaces/appUser";
import { LocalCrypto } from "../../../../../src/core/crypto";
import {
  MockedAzureAccountProvider,
  MockedM365Provider,
  MockedV2Context,
} from "../../../solution/util";
import { BuiltInSolutionNames } from "../../../../../src/plugins/solution/fx-solution/v3/constants";
import * as uuid from "uuid";
import Container from "typedi";
import { ComponentNames } from "../../../../../src/component/constants";
import { AppManifest } from "../../../../../src/component/resource/appManifest/appManifest";
import { MockTools } from "../../../../core/utils";
import { setTools } from "../../../../../src/core/globalVars";
import { newEnvInfo } from "../../../../../src/core/environment";
import axios from "axios";
import { AppDefinition } from "../../../../../src/plugins/resource/appstudio/interfaces/appDefinition";

const userList: AppUser = {
  tenantId: faker.datatype.uuid(),
  aadId: faker.datatype.uuid(),
  displayName: "displayName",
  userPrincipalName: "userPrincipalName",
  isAdministrator: true,
};

describe("Remote Collaboration", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  let configOfOtherPlugins: Map<string, ConfigMap>;
  setTools(new MockTools());
  const sandbox = sinon.createSandbox();
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
  const ctxV2 = new MockedV2Context(projectSettings);
  const tokenProvider: TokenProvider = {
    azureAccountProvider: new MockedAzureAccountProvider(),
    m365TokenProvider: new MockedM365Provider(),
  };
  beforeEach(async () => {
    plugin = new AppStudioPlugin();
    configOfOtherPlugins = new Map();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("Check permission", async () => {
    const appId = faker.datatype.uuid();

    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      answers: { platform: Platform.VSCode },
      m365TokenProvider: new MockedM365Provider(),
      cryptoProvider: new LocalCrypto(""),
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: "project id",
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };
    const appStudioConfig = new ConfigMap();
    appStudioConfig.set(Constants.TEAMS_APP_ID, appId);
    ctx.envInfo.state.set(PluginNames.APPST, appStudioConfig);

    sandbox.stub(ctx.m365TokenProvider!, "getAccessToken").resolves(ok("anything"));
    sandbox.stub(AppStudioClient, "checkPermission").resolves("Administrator");

    const checkPermission = await plugin.checkPermission(ctx, userList);
    chai.assert.isTrue(checkPermission.isOk());
    if (checkPermission.isOk()) {
      chai.assert.deepEqual(checkPermission.value[0].roles, ["Administrator"]);
    }
  });

  it("Check permission V3", async () => {
    const appId = faker.datatype.uuid();
    ctxV2.projectSetting.solutionSettings!.activeResourcePlugins = ["fx-resource-frontend-hosting"];
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: {
        solution: { provisionSucceeded: true },
        [ComponentNames.AppManifest]: { teamsAppId: appId },
      },
      config: {},
    };
    const component = Container.get<AppManifest>(ComponentNames.AppManifest);
    sandbox.stub(tokenProvider.m365TokenProvider, "getAccessToken").resolves(ok("anything"));
    sandbox.stub(AppStudioClient, "checkPermission").resolves("Administrator");
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
    };
    const checkPermission = await component.checkPermission(
      ctxV2,
      inputs,
      envInfo,
      tokenProvider.m365TokenProvider,
      userList
    );
    chai.assert.isTrue(checkPermission.isOk());
    if (checkPermission.isOk()) {
      chai.assert.deepEqual(checkPermission.value[0].roles, ["Administrator"]);
    }
  });

  it("Grant permission", async () => {
    const appId = faker.datatype.uuid();

    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      answers: { platform: Platform.VSCode },
      m365TokenProvider: new MockedM365Provider(),
      cryptoProvider: new LocalCrypto(""),
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: "project id",
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };

    const appDef: AppDefinition = {
      appName: "fake",
      teamsAppId: appId,
      userList: [],
    };

    const appStudioConfig = new ConfigMap();
    appStudioConfig.set(Constants.TEAMS_APP_ID, appId);
    ctx.envInfo.state.set(PluginNames.APPST, appStudioConfig);

    sandbox.stub(ctx.m365TokenProvider!, "getAccessToken").resolves(ok("anything"));

    const fakeAxiosInstance = axios.create();
    sandbox.stub(axios, "create").returns(fakeAxiosInstance);
    sandbox.stub(fakeAxiosInstance, "get").resolves({
      data: appDef,
    });

    sandbox
      .stub(fakeAxiosInstance, "post")
      .onCall(0)
      .rejects(new Error("Request failed with status code 400"))
      .onCall(1)
      .resolves();

    const grantPermission = await plugin.grantPermission(ctx, userList);
    chai.assert.isTrue(grantPermission.isOk());
    if (grantPermission.isOk()) {
      chai.assert.deepEqual(grantPermission.value[0].roles, ["Administrator"]);
    }
  });

  it("Grant permission V3", async () => {
    const appId = faker.datatype.uuid();
    ctxV2.projectSetting.solutionSettings!.activeResourcePlugins = ["fx-resource-frontend-hosting"];
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: {
        solution: { provisionSucceeded: true },
        [ComponentNames.AppManifest]: { teamsAppId: appId },
      },
      config: {},
    };
    const appDef: AppDefinition = {
      appName: "fake",
      teamsAppId: appId,
      userList: [],
    };
    const component = Container.get<AppManifest>(ComponentNames.AppManifest);
    sandbox.stub(ctx.m365TokenProvider!, "getAccessToken").resolves(ok("anything"));
    const fakeAxiosInstance = axios.create();
    sandbox.stub(axios, "create").returns(fakeAxiosInstance);
    sandbox.stub(fakeAxiosInstance, "get").resolves({
      data: appDef,
    });

    sandbox
      .stub(fakeAxiosInstance, "post")
      .onCall(0)
      .rejects(new Error("Request failed with status code 400"))
      .onCall(1)
      .resolves();
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
    };
    const grantPermission = await component.grantPermission(
      ctxV2,
      inputs,
      envInfo,
      tokenProvider.m365TokenProvider,
      userList
    );
    chai.assert.isTrue(grantPermission.isOk());
    if (grantPermission.isOk()) {
      chai.assert.deepEqual(grantPermission.value[0].roles, ["Administrator"]);
    }
  });

  it("List collaborator", async () => {
    const appId = faker.datatype.uuid();

    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      answers: { platform: Platform.VSCode },
      m365TokenProvider: new MockedM365Provider(),
      cryptoProvider: new LocalCrypto(""),
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: "project id",
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };
    const appStudioConfig = new ConfigMap();
    appStudioConfig.set(Constants.TEAMS_APP_ID, appId);
    ctx.envInfo.state.set(PluginNames.APPST, appStudioConfig);

    sandbox.stub(ctx.m365TokenProvider!, "getAccessToken").resolves(ok("anything"));
    sandbox.stub(AppStudioClient, "getUserList").resolves([
      {
        aadId: "aadId",
        tenantId: "tenantId",
        userPrincipalName: "userPrincipalName",
        displayName: "displayName",
        isAdministrator: true,
      },
    ]);

    const listCollaborator = await plugin.listCollaborator(ctx);
    chai.assert.isTrue(listCollaborator.isOk());
    if (listCollaborator.isOk()) {
      chai.assert.equal(listCollaborator.value[0].userObjectId, "aadId");
    }
  });

  it("List collaborator V3", async () => {
    const appId = faker.datatype.uuid();
    ctxV2.projectSetting.solutionSettings!.activeResourcePlugins = ["fx-resource-frontend-hosting"];
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: {
        solution: { provisionSucceeded: true },
        [ComponentNames.AppManifest]: { teamsAppId: appId },
      },
      config: {},
    };
    const component = Container.get<AppManifest>(ComponentNames.AppManifest);
    sandbox.stub(ctx.m365TokenProvider!, "getAccessToken").resolves(ok("anything"));
    sandbox.stub(AppStudioClient, "getUserList").resolves([
      {
        aadId: "aadId",
        tenantId: "tenantId",
        userPrincipalName: "userPrincipalName",
        displayName: "displayName",
        isAdministrator: true,
      },
    ]);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
    };
    const listCollaborator = await component.listCollaborator(
      ctxV2,
      inputs,
      envInfo,
      tokenProvider.m365TokenProvider
    );
    chai.assert.isTrue(listCollaborator.isOk());
    if (listCollaborator.isOk()) {
      chai.assert.equal(listCollaborator.value[0].userObjectId, "aadId");
    }
  });
});
