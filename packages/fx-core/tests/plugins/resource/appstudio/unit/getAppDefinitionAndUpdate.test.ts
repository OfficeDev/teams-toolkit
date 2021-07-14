// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { AppStudioPluginImpl } from "./../../../../../src/plugins/resource/appstudio/plugin";
import { AppStudioClient } from "./../../../../../src/plugins/resource/appstudio/appStudio";
import { IAppDefinition } from "./../../../../../src/plugins/resource/appstudio/interfaces/IAppDefinition";
import {
  TEAMS_APP_MANIFEST_TEMPLATE,
  CONFIGURABLE_TABS_TPL,
  STATIC_TABS_TPL,
  BOTS_TPL,
  COMPOSE_EXTENSIONS_TPL,
  TEAMS_APP_SHORT_NAME_MAX_LENGTH,
  DEFAULT_DEVELOPER_WEBSITE_URL,
  DEFAULT_DEVELOPER_TERM_OF_USE_URL,
  DEFAULT_DEVELOPER_PRIVACY_URL,
  LOCAL_DEBUG_TAB_ENDPOINT,
  LOCAL_DEBUG_TAB_DOMAIN,
  FRONTEND_ENDPOINT,
  FRONTEND_DOMAIN,
  LOCAL_DEBUG_AAD_ID,
  LOCAL_DEBUG_TEAMS_APP_ID,
  REMOTE_AAD_ID,
  LOCAL_BOT_ID,
  BOT_ID,
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
  ok,
  err,
  Plugin,
} from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import fs from "fs-extra";
import sinon from "sinon";
import { AppStudioResultFactory } from "../../../../../src/plugins/resource/appstudio/results";

describe("Reload Manifest and Check Required Fields", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  let manifest: TeamsAppManifest;
  let appDef: IAppDefinition | undefined;

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

  it("maybeAppDefinition error", async () => {
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
    const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
      ctx,
      "localDebug",
      manifest,
      "appStudioToken"
    );
    chai.assert.isTrue(getAppDefinitionAndResult.isErr());
    if (getAppDefinitionAndResult.isErr()) {
      chai
        .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.UnhandledError.name);
    }
  });

  it("webApplicationInfoResource get localDebug config failed error", async () => {
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

  it("local clientId get localDebug config failed error", async () => {
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

  it("local tab endpoint and local botId get localDebug config failed error", async () => {
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

  it("invalid localDebug configuration data error", async () => {
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

  it("local bot domain get localDebug config failed error", async () => {
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

  it("get config for creating manifest happy path", async () => {
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

  it("app studio token get failed error", async () => {
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

  // it("local appId create failed error", async () => {
  // 	configOfOtherPlugins.set(PluginNames.AAD, AAD_ConfigMap);
  // 	configOfOtherPlugins.set(PluginNames.LDEBUG, LDEBUG_ConfigMap);
  // 	configOfOtherPlugins.set(PluginNames.BOT, BOT_ConfigMap);
  // 	ctx = {
  //     root: "./tests/plugins/resource/appstudio/resources/",
  //     configOfOtherPlugins: configOfOtherPlugins,
  //     config: new ConfigMap(),
  //     app: new TeamsAppManifest(),
  //   };
  //   ctx.projectSettings = {
  //   	appName: "my app",
  //   	currentEnv: "default",
  //   	projectId: uuid.v4(),
  //   	solutionSettings: {
  //       name: "azure",
  //       version: "1.0",
  //       capabilities: ["Bot"],
  //   	},
  //   };

  // 	appDef = undefined;
  // 	sandbox.stub(AppStudioClient, "createApp").returns(appDef);

  //   const getAppDefinitionAndResult = await plugin.getAppDefinitionAndUpdate(
  //     ctx,
  //     "localDebug",
  //     manifest,
  // 		"app studio token"
  //   );

  //   chai.assert.isTrue(getAppDefinitionAndResult.isErr());
  //   if (getAppDefinitionAndResult.isErr()) {
  //     chai
  //       .expect(getAppDefinitionAndResult._unsafeUnwrapErr().name)
  //       .equals(AppStudioError.LocalAppIdCreateFailedError.name);
  //   }
  // });
});
