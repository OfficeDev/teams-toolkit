// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import axios from "axios";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { AppStudioPluginImpl } from "./../../../../../src/plugins/resource/appstudio/plugin";
import { AppStudioClient } from "./../../../../../src/plugins/resource/appstudio/appStudio";
import { IAppDefinition } from "./../../../../../src/plugins/resource/appstudio/interfaces/IAppDefinition";
import {
  FRONTEND_ENDPOINT,
  FRONTEND_DOMAIN,
  LOCAL_BOT_ID,
  BOT_ID,
  Constants,
} from "./../../../../../src/plugins/resource/appstudio/constants";
import {
  LOCAL_DEBUG_TAB_ENDPOINT,
  LOCAL_DEBUG_TAB_DOMAIN,
  LOCAL_DEBUG_AAD_ID,
  REMOTE_AAD_ID,
  LOCAL_DEBUG_BOT_DOMAIN,
  BOT_DOMAIN,
  LOCAL_WEB_APPLICATION_INFO_SOURCE,
  WEB_APPLICATION_INFO_SOURCE,
  PluginNames,
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
import { AppStudioResultFactory } from "../../../../../src/plugins/resource/appstudio/results";
import { getAzureProjectRoot, MockedAppStudioTokenProvider } from "../helper";
import { isMultiEnvEnabled } from "../../../../../src/common/tools";
import { newEnvInfo } from "../../../../../src/core/tools";
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

  const appDef: IAppDefinition = {
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
    outlineIcon: isMultiEnvEnabled() ? "resources/outline.png" : "outline.png",
    colorIcon: isMultiEnvEnabled() ? "resources/color.png" : "color.png",
  };

  let AAD_ConfigMap: ConfigMap;
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

    if (isMultiEnvEnabled()) {
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
    }

    AAD_ConfigMap = new ConfigMap();
    AAD_ConfigMap.set(REMOTE_AAD_ID, uuid.v4());
    if (!isMultiEnvEnabled()) {
      AAD_ConfigMap.set(LOCAL_DEBUG_AAD_ID, localDebugBotId);
      AAD_ConfigMap.set(LOCAL_WEB_APPLICATION_INFO_SOURCE, localDebugApplicationIdUris);
    }
    AAD_ConfigMap.set(WEB_APPLICATION_INFO_SOURCE, "web application info source");

    BOT_ConfigMap = new ConfigMap();
    if (!isMultiEnvEnabled()) {
      BOT_ConfigMap.set(LOCAL_BOT_ID, localDebugBotId);
    }
    BOT_ConfigMap.set(BOT_ID, uuid.v4());
    BOT_ConfigMap.set(BOT_DOMAIN, "bot domain");

    if (!isMultiEnvEnabled()) {
      LDEBUG_ConfigMap = new ConfigMap();
      LDEBUG_ConfigMap.set(LOCAL_DEBUG_TAB_ENDPOINT, localDebugTabEndpoint);
      LDEBUG_ConfigMap.set(LOCAL_DEBUG_TAB_DOMAIN, localDebugTabDomain);
      LDEBUG_ConfigMap.set(LOCAL_DEBUG_BOT_DOMAIN, localDebugBotDomain);
    }

    FE_ConfigMap = new ConfigMap();
    FE_ConfigMap.set(FRONTEND_ENDPOINT, "frontend endpoint");
    FE_ConfigMap.set(FRONTEND_DOMAIN, "frontend domain");

    APPST_ConfigMap = new ConfigMap();
    APPST_ConfigMap.set(Constants.TEAMS_APP_ID, "my app");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should return maybeAppDefinition error", async () => {
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      appStudioToken: new MockedAppStudioTokenProvider(),
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
    sandbox
      .stub(AppStudioPluginImpl.prototype, "getAppDefinitionAndManifest" as any)
      .returns(
        err(
          AppStudioResultFactory.SystemError(
            AppStudioError.UnhandledError.name,
            AppStudioError.UnhandledError.message
          )
        )
      );

    sandbox.stub(ctx.appStudioToken!, "getAccessToken").resolves("anything");
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.UnhandledError.name);
    }
  });

  it("failed to get webApplicationInfoResource from local config and should return error", async () => {
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      cryptoProvider: new LocalCrypto(""),
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
      if (isMultiEnvEnabled()) {
        chai
          .expect(getAppDefinitionAndResult._unsafeUnwrapErr().message)
          .includes("applicationIdUris");
      } else {
        chai
          .expect(getAppDefinitionAndResult._unsafeUnwrapErr().message)
          .includes("webApplicationInfoResource");
      }
    }
  });

  it("failed to get clientId from local config and should return error", async () => {
    if (isMultiEnvEnabled()) {
      localSettings.auth?.delete(LocalSettingsAuthKeys.ClientId);
    } else {
      AAD_ConfigMap.delete(LOCAL_DEBUG_AAD_ID);
      configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    }
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      cryptoProvider: new LocalCrypto(""),
      localSettings: localSettings,
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
      if (isMultiEnvEnabled()) {
        chai.expect(getAppDefinitionAndResult._unsafeUnwrapErr().message).includes("clientId");
      } else {
        chai.expect(getAppDefinitionAndResult._unsafeUnwrapErr().message).includes("{appClientId}");
      }
    }
  });

  it("failed to get tab endpoint and botId from local config and should return error", async () => {
    if (isMultiEnvEnabled()) {
      localSettings.frontend?.delete(LocalSettingsFrontendKeys.TabEndpoint);
      localSettings.bot?.delete(LocalSettingsBotKeys.BotId);
    } else {
      LDEBUG_ConfigMap.delete(LOCAL_DEBUG_TAB_ENDPOINT);
      BOT_ConfigMap.delete(LOCAL_BOT_ID);
      configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
      configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
      configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    }
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
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
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.GetLocalDebugConfigFailedError.name);
    }
  });

  it("failed to get bot domain from local config and should return error", async () => {
    if (isMultiEnvEnabled()) {
      localSettings.bot?.delete(LocalSettingsBotKeys.BotDomain);
    } else {
      LDEBUG_ConfigMap.delete(LOCAL_DEBUG_BOT_DOMAIN);
      configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
      configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
      configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    }
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
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
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.GetLocalDebugConfigFailedError.name);
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().message)
        .includes(LOCAL_DEBUG_BOT_DOMAIN);
    }
  });

  it("should work for bot only project local debug", async () => {
    if (isMultiEnvEnabled()) {
      localSettings.frontend = undefined;
      localSettings.teamsApp = undefined;
    } else {
      configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
      configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
      configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    }
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
      appStudioToken: new MockedAppStudioTokenProvider(),
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

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);
    console.log(getAppDefinitionAndResult);
    chai.assert.isTrue(getAppDefinitionAndResult.isOk());
  });

  it("should work and get config for creating manifest for happy path", async () => {
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      config: new ConfigMap(),
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

    sandbox
      .stub(AppStudioPluginImpl.prototype, "getAppDefinitionAndManifest" as any)
      .returns(
        err(
          AppStudioResultFactory.SystemError(
            AppStudioError.UnhandledError.name,
            AppStudioError.UnhandledError.message
          )
        )
      );
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(ctx, true, manifest);
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.UnhandledError.name);
    }
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
        .equals(AppStudioError.AppStudioTokenGetFailedError.name);
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
      appStudioToken: new MockedAppStudioTokenProvider(),
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
      appStudioToken: new MockedAppStudioTokenProvider(),
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

    const appDef: IAppDefinition = {
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
      appStudioToken: new MockedAppStudioTokenProvider(),
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

    const appDef: IAppDefinition = {
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
      outlineIcon: isMultiEnvEnabled() ? "resources/outline.png" : "outline.png",
      colorIcon: isMultiEnvEnabled() ? "resources/color.png" : "color.png",
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
      appStudioToken: new MockedAppStudioTokenProvider(),
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
      appStudioToken: new MockedAppStudioTokenProvider(),
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

    const appDef: IAppDefinition = {
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
      appStudioToken: new MockedAppStudioTokenProvider(),
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
