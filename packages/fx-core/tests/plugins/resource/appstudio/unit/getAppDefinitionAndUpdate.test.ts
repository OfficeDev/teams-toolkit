// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import axios from "axios";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { AppStudioClient } from "./../../../../../src/plugins/resource/appstudio/appStudio";
import { AppDefinition } from "../../../../../src/plugins/resource/appstudio/interfaces/appDefinition";
import {
  FRONTEND_ENDPOINT,
  FRONTEND_DOMAIN,
  BOT_ID,
  Constants,
  FRONTEND_INDEX_PATH,
} from "./../../../../../src/plugins/resource/appstudio/constants";
import {
  REMOTE_AAD_ID,
  BOT_DOMAIN,
  WEB_APPLICATION_INFO_SOURCE,
  PluginNames,
  TEAMS_APP_ID,
  SolutionError,
} from "./../../../../../src/plugins/solution/fx-solution/constants";
import { AppStudioError } from "./../../../../../src/plugins/resource/appstudio/errors";
import {
  ConfigMap,
  PluginContext,
  TeamsAppManifest,
  err,
  LocalSettings,
} from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import sinon from "sinon";
import {
  getAzureProjectRoot,
  MockedM365TokenProvider,
  MockedM365TokenProviderFail,
} from "../helper";
import { newEnvInfo } from "../../../../../src";
import { LocalCrypto } from "../../../../../src/core/crypto";
import {
  LocalSettingsAuthKeys,
  LocalSettingsBotKeys,
  LocalSettingsFrontendKeys,
  LocalSettingsTeamsAppKeys,
} from "../../../../../src/common/localSettingsConstants";

describe("Get AppDefinition and Update", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  let manifest: TeamsAppManifest;
  let localSettings: LocalSettings;

  const localDebugApplicationIdUris = "local web application info source";
  const localDebugClientId = uuid.v4();
  const localDebugTabEndpoint = "local debug tab endpoint";
  const localDebugTabDomain = "local debug tab domain";
  const localDebugBotId = uuid.v4();
  const localDebugBotDomain = "local debug bot domain";

  const appDef: AppDefinition = {
    appName: "my app",
    teamsAppId: "appId",
    userList: [
      {
        tenantId: uuid.v4(),
        aadId: uuid.v4(),
        displayName: "displayName",
        userPrincipalName: "principalName",
        isAdministrator: true,
      },
    ],
    outlineIcon: "resources/outline.png",
    colorIcon: "resources/color.png",
  };

  let AAD_ConfigMap: ConfigMap;
  let APPSTUDIO_ConfigMap: ConfigMap;
  let BOT_ConfigMap: ConfigMap;
  let LDEBUG_ConfigMap: ConfigMap;
  let FE_ConfigMap: ConfigMap;
  let APPST_ConfigMap: ConfigMap;
  let configOfOtherPlugins: Map<string, ConfigMap>;
  const sandbox = sinon.createSandbox();

  beforeEach(async () => {
    plugin = new AppStudioPlugin();
    manifest = new TeamsAppManifest();
    configOfOtherPlugins = new Map();

    localSettings = {
      auth: new ConfigMap([
        [LocalSettingsAuthKeys.ApplicationIdUris, localDebugApplicationIdUris],
        [LocalSettingsAuthKeys.ClientId, localDebugClientId],
      ]),
      bot: new ConfigMap([
        [LocalSettingsBotKeys.BotId, localDebugBotId],
        [LocalSettingsBotKeys.BotDomain, localDebugBotDomain],
      ]),
      frontend: new ConfigMap([
        [LocalSettingsFrontendKeys.TabEndpoint, localDebugTabEndpoint],
        [LocalSettingsFrontendKeys.TabDomain, localDebugTabDomain],
      ]),
      teamsApp: new ConfigMap([[LocalSettingsTeamsAppKeys.TeamsAppId, uuid.v4()]]),
    };

    AAD_ConfigMap = new ConfigMap();
    AAD_ConfigMap.set(REMOTE_AAD_ID, uuid.v4());
    AAD_ConfigMap.set(WEB_APPLICATION_INFO_SOURCE, "web application info source");

    BOT_ConfigMap = new ConfigMap();
    BOT_ConfigMap.set(BOT_ID, uuid.v4());
    BOT_ConfigMap.set(BOT_DOMAIN, "bot domain");

    APPSTUDIO_ConfigMap = new ConfigMap();
    APPSTUDIO_ConfigMap.set(TEAMS_APP_ID, uuid.v4());

    FE_ConfigMap = new ConfigMap();
    FE_ConfigMap.set(FRONTEND_ENDPOINT, "frontend endpoint");
    FE_ConfigMap.set(FRONTEND_DOMAIN, "frontend domain");
    FE_ConfigMap.set(FRONTEND_INDEX_PATH, "frontend indexPath");

    APPST_ConfigMap = new ConfigMap();
    APPST_ConfigMap.set(Constants.TEAMS_APP_ID, "my app");

    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    configOfOtherPlugins.set(PluginNames.APPST, APPSTUDIO_ConfigMap);
    configOfOtherPlugins.set(PluginNames.FE, FE_ConfigMap);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("failed to get webApplicationInfoResource from local config and should return error", async () => {
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      cryptoProvider: new LocalCrypto(""),
      m365TokenProvider: new MockedM365TokenProvider(),
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.GetLocalDebugConfigFailedError.name);
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().message)
        .includes("applicationIdUris");
    }
  });

  it("failed to get clientId from local config and should return error", async () => {
    localSettings.auth?.delete(LocalSettingsAuthKeys.ClientId);
    configOfOtherPlugins!.get(PluginNames.AAD)!.delete(REMOTE_AAD_ID);
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      cryptoProvider: new LocalCrypto(""),
      localSettings: localSettings,
      m365TokenProvider: new MockedM365TokenProvider(),
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.GetLocalDebugConfigFailedError.name);
      chai.expect(getAppDefinitionAndResult._unsafeUnwrapErr().message).includes("clientId");
    }
  });

  it("failed to get tab endpoint and botId from local config and should return error", async () => {
    localSettings.frontend?.delete(LocalSettingsFrontendKeys.TabEndpoint);
    localSettings.bot?.delete(LocalSettingsBotKeys.BotId);
    configOfOtherPlugins.get(PluginNames.FE)!.delete(FRONTEND_ENDPOINT);
    configOfOtherPlugins.get(PluginNames.BOT)!.delete(BOT_ID);
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      cryptoProvider: new LocalCrypto(""),
      localSettings,
      m365TokenProvider: new MockedM365TokenProvider(),
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.GetLocalDebugConfigFailedError.name);
    }
  });

  it("failed to get bot domain from local config and should return error", async () => {
    localSettings.bot?.delete(LocalSettingsBotKeys.BotDomain);
    configOfOtherPlugins!.get(PluginNames.BOT)!.delete(BOT_DOMAIN);
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      cryptoProvider: new LocalCrypto(""),
      localSettings,
      m365TokenProvider: new MockedM365TokenProvider(),
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.GetRemoteConfigFailedError.name);
      chai.expect(getAppDefinitionAndResult._unsafeUnwrapErr().message).includes(BOT_DOMAIN);
    }
  });

  it("should work for bot only project local debug", async () => {
    localSettings.frontend = undefined;
    localSettings.teamsApp = undefined;
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      m365TokenProvider: new MockedM365TokenProvider(),
      cryptoProvider: new LocalCrypto(""),
      localSettings,
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    sandbox.stub(AppStudioClient, "createApp").resolves(appDef);
    sandbox.stub(AppStudioClient, "updateApp").resolves(appDef);

    // TODO: why get capabilities via manifest
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);
    console.log(getAppDefinitionAndResult);
    chai.assert.isTrue(getAppDefinitionAndResult.isOk());
  });

  it("failed to get app studio token and should return error", async () => {
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      cryptoProvider: new LocalCrypto(""),
      localSettings,
      m365TokenProvider: new MockedM365TokenProviderFail(),
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);

    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(SolutionError.NoAppStudioToken);
    }
  });

  it("failed to create local appId and should return error", async () => {
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      m365TokenProvider: new MockedM365TokenProvider(),
      cryptoProvider: new LocalCrypto(""),
      localSettings,
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    const fakeAxiosInstance = axios.create();
    sandbox.stub(fakeAxiosInstance, "post").resolves({
      status: 502,
      data: {
        error: {
          code: "BadGateway",
        },
      },
    });
    sandbox.stub(axios, "create").returns(fakeAxiosInstance);

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);

    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.LocalAppIdCreateFailedError.name);
    }
  });

  it("failed to update local appId and should return error", async () => {
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      m365TokenProvider: new MockedM365TokenProvider(),
      cryptoProvider: new LocalCrypto(""),
      localSettings,
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    const appDef: AppDefinition = {
      appName: "my app",
      teamsAppId: "appId",
      userList: [
        {
          tenantId: uuid.v4(),
          aadId: uuid.v4(),
          displayName: "displayName",
          userPrincipalName: "principalName",
          isAdministrator: true,
        },
      ],
    };

    const fakeAxiosInstance = axios.create();
    sandbox.stub(fakeAxiosInstance, "get").resolves({
      status: 200,
      data: appDef,
    });

    sandbox.stub<any, any>(fakeAxiosInstance, "post").callsFake(async (url: string) => {
      if (url == "/api/appdefinitions/appId/image") return {};
      if (url == "/api/appdefinitions/appId/override") return {};
      return {};
    });

    sandbox.stub(axios, "create").returns(fakeAxiosInstance);
    sandbox.stub(AppStudioClient, "createApp").resolves(appDef);

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);

    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.LocalAppIdUpdateFailedError.name);
    }
  });

  it("should return Ok for localDebug happy path", async () => {
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      m365TokenProvider: new MockedM365TokenProvider(),
      cryptoProvider: new LocalCrypto(""),
      localSettings,
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    const appDef: AppDefinition = {
      appName: "my app",
      teamsAppId: "appId",
      userList: [
        {
          tenantId: uuid.v4(),
          aadId: uuid.v4(),
          displayName: "displayName",
          userPrincipalName: "principalName",
          isAdministrator: true,
        },
      ],
      outlineIcon: "resources/outline.png",
      colorIcon: "resources/color.png",
    };

    const fakeAxiosInstance = axios.create();
    sandbox.stub(fakeAxiosInstance, "get").resolves({
      status: 200,
      data: appDef,
    });

    sandbox.stub<any, any>(fakeAxiosInstance, "post").callsFake(async (url: string) => {
      if (url == "/api/appdefinitions/appId/image") return {};
      if (url == "/api/appdefinitions/appId/override") return { status: 200, data: appDef };
      return {};
    });

    sandbox.stub(axios, "create").returns(fakeAxiosInstance);
    sandbox.stub(AppStudioClient, "createApp").resolves(appDef);

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);

    chai.assert.isTrue(getAppDefinitionAndResult.isOk());
  });

  it("failed to create remote appId and should return error", async () => {
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      m365TokenProvider: new MockedM365TokenProvider(),
      cryptoProvider: new LocalCrypto(""),
      localSettings,
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, false, manifest);

    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.RemoteAppIdCreateFailedError.name);
    }
  });

  it("failed to update remote appId and should return error", async () => {
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      m365TokenProvider: new MockedM365TokenProvider(),
      cryptoProvider: new LocalCrypto(""),
      localSettings,
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    const appDef: AppDefinition = {
      appName: "my app",
      teamsAppId: "appId",
      userList: [
        {
          tenantId: uuid.v4(),
          aadId: uuid.v4(),
          displayName: "displayName",
          userPrincipalName: "principalName",
          isAdministrator: true,
        },
      ],
    };

    const fakeAxiosInstance = axios.create();
    sandbox.stub(fakeAxiosInstance, "get").resolves({
      status: 200,
      data: appDef,
    });

    sandbox.stub<any, any>(fakeAxiosInstance, "post").callsFake(async (url: string) => {
      if (url == "/api/appdefinitions/appId/image") return {};
      if (url == "/api/appdefinitions/appId/override") return {};
      return {};
    });

    sandbox.stub(axios, "create").returns(fakeAxiosInstance);
    sandbox.stub(AppStudioClient, "createApp").resolves(appDef);

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, false, manifest);

    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.RemoteAppIdUpdateFailedError.name);
    }
  });

  it("should return Ok for remote happy path", async () => {
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      m365TokenProvider: new MockedM365TokenProvider(),
      cryptoProvider: new LocalCrypto(""),
      localSettings,
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    const fakeAxiosInstance = axios.create();
    sandbox.stub(fakeAxiosInstance, "get").resolves({
      status: 200,
      data: appDef,
    });

    sandbox.stub<any, any>(fakeAxiosInstance, "post").callsFake(async (url: string) => {
      if (url == "/api/appdefinitions/appId/image") return {};
      if (url == "/api/appdefinitions/appId/override") return { status: 200, data: appDef };
      return {};
    });

    sandbox.stub(axios, "create").returns(fakeAxiosInstance);
    sandbox.stub(AppStudioClient, "createApp").resolves(appDef);

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, false, manifest);

    chai.assert.isTrue(getAppDefinitionAndResult.isOk());
  });
});
