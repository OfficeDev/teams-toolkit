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
  AppStudioTokenProvider,
  ConfigMap,
  PluginContext,
  TeamsAppManifest,
  err,
} from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import sinon from "sinon";
import { AppStudioResultFactory } from "../../../../../src/plugins/resource/appstudio/results";

class MockedAppStudioTokenProvider implements AppStudioTokenProvider {
  async getAccessToken(showDialog?: boolean): Promise<string> {
    return "someFakeToken";
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {
      tid: "222",
    };
  }
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeCallback(
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}

describe("Get AppDefinition and Update", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  let manifest: TeamsAppManifest;

  let AAD_ConfigMap: ConfigMap;
  let BOT_ConfigMap: ConfigMap;
  let LDEBUG_ConfigMap: ConfigMap;
  let FE_ConfigMap: ConfigMap;
  let configOfOtherPlugins: Map<string, ConfigMap>;
  const sandbox = sinon.createSandbox();

  beforeEach(async () => {
    plugin = new AppStudioPlugin();
    manifest = new TeamsAppManifest();
    configOfOtherPlugins = new Map();

    AAD_ConfigMap = new ConfigMap();
    AAD_ConfigMap.set(LOCAL_DEBUG_AAD_ID, uuid.v4());
    AAD_ConfigMap.set(REMOTE_AAD_ID, uuid.v4());
    AAD_ConfigMap.set(LOCAL_WEB_APPLICATION_INFO_SOURCE, "local web application info source");
    AAD_ConfigMap.set(WEB_APPLICATION_INFO_SOURCE, "web application info source");

    BOT_ConfigMap = new ConfigMap();
    BOT_ConfigMap.set(LOCAL_BOT_ID, uuid.v4());
    BOT_ConfigMap.set(BOT_ID, uuid.v4());
    BOT_ConfigMap.set(BOT_DOMAIN, "bot domain");

    LDEBUG_ConfigMap = new ConfigMap();
    LDEBUG_ConfigMap.set(LOCAL_DEBUG_TAB_ENDPOINT, "local debug tab endpoint");
    LDEBUG_ConfigMap.set(LOCAL_DEBUG_TAB_DOMAIN, "local debug tab domain");
    LDEBUG_ConfigMap.set(LOCAL_DEBUG_BOT_DOMAIN, "local debug bot domain");

    FE_ConfigMap = new ConfigMap();
    FE_ConfigMap.set(FRONTEND_ENDPOINT, "frontend endpoint");
    FE_ConfigMap.set(FRONTEND_DOMAIN, "frontend domain");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should return maybeAppDefinition error", async () => {
    ctx = {
      root: "./",
      configOfOtherPlugins: new Map(),
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
      appStudioToken: new MockedAppStudioTokenProvider(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };
    sandbox
      .stub(AppStudioPluginImpl.prototype, "getConfigAndAppDefinition" as any)
      .returns(
        err(
          AppStudioResultFactory.SystemError(
            AppStudioError.UnhandledError.name,
            AppStudioError.UnhandledError.message
          )
        )
      );

    sandbox.stub(ctx.appStudioToken!, "getAccessToken").resolves("anything");
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "localDebug",
      manifest
    );
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.UnhandledError.name);
    }
  });

  it("failed to get webApplicationInfoResource from local config and should return error", async () => {
    ctx = {
      root: "./",
      configOfOtherPlugins: new Map(),
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "localDebug",
      manifest
    );
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.GetLocalDebugConfigFailedError.name);
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().message)
        .includes("webApplicationInfoResource");
    }
  });

  it("failed to get clientId from local config and should return error", async () => {
    AAD_ConfigMap.delete(LOCAL_DEBUG_AAD_ID);
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    ctx = {
      root: "./",
      configOfOtherPlugins: configOfOtherPlugins,
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "localDebug",
      manifest
    );
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.GetLocalDebugConfigFailedError.name);
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().message)
        .includes(LOCAL_DEBUG_AAD_ID);
    }
  });

  it("failed to get tab endpoint and botId from local config and should return error", async () => {
    LDEBUG_ConfigMap.delete(LOCAL_DEBUG_TAB_ENDPOINT);
    BOT_ConfigMap.delete(LOCAL_BOT_ID);
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    ctx = {
      root: "./",
      configOfOtherPlugins: configOfOtherPlugins,
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "localDebug",
      manifest
    );
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.GetLocalDebugConfigFailedError.name);
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().message)
        .includes(LOCAL_DEBUG_TAB_ENDPOINT);
      chai.expect(getAppDefinitionAndResult._unsafeUnwrapErr().message).includes(LOCAL_BOT_ID);
    }
  });

  it("doesn't have both tab endpoint and tab domain in local config and should return error", async () => {
    LDEBUG_ConfigMap.delete(LOCAL_DEBUG_TAB_ENDPOINT);
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    ctx = {
      root: "./",
      configOfOtherPlugins: configOfOtherPlugins,
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "localDebug",
      manifest
    );
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.InvalidLocalDebugConfigurationDataError.name);
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().message)
        .includes(LOCAL_DEBUG_TAB_ENDPOINT);
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().message)
        .includes(LOCAL_DEBUG_TAB_DOMAIN);
    }
  });

  it("failed to get bot domain from local config and should return error", async () => {
    LDEBUG_ConfigMap.delete(LOCAL_DEBUG_BOT_DOMAIN);
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    ctx = {
      root: "./",
      configOfOtherPlugins: configOfOtherPlugins,
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "localDebug",
      manifest
    );
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

  it("should work and get config for creating manifest for happy path", async () => {
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    ctx = {
      root: "./",
      configOfOtherPlugins: configOfOtherPlugins,
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    sandbox
      .stub(AppStudioPluginImpl.prototype, "getConfigForCreatingManifest" as any)
      .returns(
        err(
          AppStudioResultFactory.SystemError(
            AppStudioError.UnhandledError.name,
            AppStudioError.UnhandledError.message
          )
        )
      );
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "localDebug",
      manifest
    );
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
      root: "./tests/plugins/resource/appstudio/resources/",
      configOfOtherPlugins: configOfOtherPlugins,
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "localDebug",
      manifest
    );

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
      root: "./tests/plugins/resource/appstudio/resources/",
      configOfOtherPlugins: configOfOtherPlugins,
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
      appStudioToken: new MockedAppStudioTokenProvider(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    const fakeAxiosInstance = axios.create();
    sandbox.stub(fakeAxiosInstance, "post").resolves({
      status: 200,
      data: {
        appId: "appId",
        id: "id",
        secretText: "secretText",
      },
    });
    sandbox.stub(axios, "create").returns(fakeAxiosInstance);

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "localDebug",
      manifest
    );

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
      root: "./tests/plugins/resource/appstudio/resources/",
      configOfOtherPlugins: configOfOtherPlugins,
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
      appStudioToken: new MockedAppStudioTokenProvider(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
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
          isOwner: true,
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

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "localDebug",
      manifest
    );

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
      root: "./tests/plugins/resource/appstudio/resources/",
      configOfOtherPlugins: configOfOtherPlugins,
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
      appStudioToken: new MockedAppStudioTokenProvider(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
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
          isOwner: true,
        },
      ],
      outlineIcon: "outline.png",
      colorIcon: "color.png",
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

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "localDebug",
      manifest
    );

    chai.assert.isTrue(getAppDefinitionAndResult.isOk());
  });

  it("failed to create remote appId and should return error", async () => {
    configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
    configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
    configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
    ctx = {
      root: "./tests/plugins/resource/appstudio/resources/",
      configOfOtherPlugins: configOfOtherPlugins,
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
      appStudioToken: new MockedAppStudioTokenProvider(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "remote",
      manifest
    );

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
      root: "./tests/plugins/resource/appstudio/resources/",
      configOfOtherPlugins: configOfOtherPlugins,
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
      appStudioToken: new MockedAppStudioTokenProvider(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
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
          isOwner: true,
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

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "remote",
      manifest
    );

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
      root: "./tests/plugins/resource/appstudio/resources/",
      configOfOtherPlugins: configOfOtherPlugins,
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
      appStudioToken: new MockedAppStudioTokenProvider(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
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
          isOwner: true,
        },
      ],
      outlineIcon: "outline.png",
      colorIcon: "color.png",
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

    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "remote",
      manifest
    );

    chai.assert.isTrue(getAppDefinitionAndResult.isOk());
  });
});
