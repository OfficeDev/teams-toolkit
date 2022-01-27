// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { EnvConfig, Platform, v2, v3 } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import * as os from "os";
import * as path from "path";
import "reflect-metadata";
import sinon from "sinon";
import { createV2Context, newProjectSettings, setTools } from "../../../../../src";
import {
  GetConfigError,
  GetSkipAppConfigError,
} from "../../../../../src/plugins/resource/aad/errors";
import { Utils } from "../../../../../src/plugins/resource/aad/utils/common";
import {
  PostProvisionConfig,
  ProvisionConfig,
  SetApplicationInContextConfig,
} from "../../../../../src/plugins/resource/aad/utils/configs";
import {
  checkPermissionRequest,
  createPermissionRequestFile,
  getPermissionRequest,
} from "../../../../../src/plugins/resource/aad/v3";
import { BuiltInResourcePluginNames } from "../../../../../src/plugins/solution/fx-solution/v3/constants";
import { deleteFolder, MockTools, randomAppName } from "../../../../core/utils";
import * as uuid from "uuid";
describe("AAD resource plugin V3", () => {
  const sandbox = sinon.createSandbox();
  beforeEach(async () => {
    setTools(new MockTools());
  });
  afterEach(async () => {
    sandbox.restore();
  });
  it("permission request file", async () => {
    const projectPath = path.join(os.tmpdir(), randomAppName());
    await fs.ensureDir(projectPath);
    const createRes = await createPermissionRequestFile(projectPath);
    assert.isTrue(createRes.isOk() && createRes.value !== undefined);
    const checkRes = await checkPermissionRequest(projectPath);
    assert.isTrue(checkRes.isOk() && createRes.isOk() && checkRes.value === createRes.value);
    const getRes = await getPermissionRequest(projectPath);
    assert.isTrue(getRes.isOk() && getRes.value !== undefined);
    deleteFolder(projectPath);
  });
  it("skipCreateAadForProvision skip = true", async () => {
    const envConfig: EnvConfig = {
      auth: {
        objectId: "mockObjectId",
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        accessAsUserScopeId: "mockAccessAsUserScopeId",
      },
      manifest: {
        appName: {
          short: "myApp",
        },
      },
    };
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      config: envConfig,
      state: {
        solution: {},
        [BuiltInResourcePluginNames.aad]: {},
      },
    };
    const skip = await Utils.skipCreateAadForProvision(envInfo);
    assert.isTrue(skip);
    const aadResource = envInfo.state[BuiltInResourcePluginNames.aad] as v3.AADApp;
    assert.isTrue(aadResource.objectId === envConfig.auth?.objectId);
    assert.isTrue(aadResource.clientId === envConfig.auth?.clientId);
    assert.isTrue(aadResource.clientSecret === envConfig.auth?.clientSecret);
    assert.isTrue(aadResource.oauth2PermissionScopeId === envConfig.auth?.accessAsUserScopeId);
  });
  it("skipCreateAadForProvision skip = false", async () => {
    const envConfig: EnvConfig = {
      auth: {},
      manifest: {
        appName: {
          short: "myApp",
        },
      },
    };
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      config: envConfig,
      state: {
        solution: {},
        [BuiltInResourcePluginNames.aad]: {},
      },
    };
    const skip = await Utils.skipCreateAadForProvision(envInfo);
    assert.isTrue(skip === false);
  });
  it("skipCreateAadForProvision throw error", async () => {
    const envConfig: EnvConfig = {
      auth: {},
      manifest: {
        appName: {
          short: "myApp",
        },
      },
    };
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      config: envConfig,
      state: {
        solution: {},
        [BuiltInResourcePluginNames.aad]: {
          objectId: "mockObjectId",
        },
      },
    };
    try {
      await Utils.skipCreateAadForProvision(envInfo);
    } catch (e) {
      assert.isTrue(e.name === GetSkipAppConfigError.name);
    }
  });
  it("skipCreateAadForLocalProvision skip = true", async () => {
    const localSettings: v2.LocalSettings = {
      teamsApp: {},
      auth: {
        objectId: "mockObjectId",
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        oauth2PermissionScopeId: "mockOauth2PermissionScopeId",
      },
    };
    const skip = await Utils.skipCreateAadForLocalProvision(localSettings);
    assert.isTrue(skip);
  });
  it("skipCreateAadForLocalProvision skip = false", async () => {
    const localSettings: v2.LocalSettings = {
      teamsApp: {},
      auth: {},
    };
    const skip = await Utils.skipCreateAadForLocalProvision(localSettings);
    assert.isTrue(skip === false);
  });
  it("skipCreateAadForProvision throw error", async () => {
    const localSettings: v2.LocalSettings = {
      teamsApp: {},
      auth: {
        objectId: "mockObjectId",
      },
    };
    try {
      await Utils.skipCreateAadForLocalProvision(localSettings);
    } catch (e) {
      assert.isTrue(e.name === GetSkipAppConfigError.name);
    }
  });

  it("ProvisionConfig - restoreConfigFromLocalSettings - success", async () => {
    const localSettings: v2.LocalSettings = {
      teamsApp: {},
      auth: {
        objectId: "mockObjectId",
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        oauth2PermissionScopeId: "mockOauth2PermissionScopeId",
      },
    };
    const config = new ProvisionConfig(true);
    const projectSettings = newProjectSettings();
    projectSettings.appName = randomAppName();
    const ctx = createV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    sandbox.stub<any, any>(fs, "pathExists").resolves(true);
    sandbox.stub<any, any>(fs, "readJSON").resolves("");
    const res = await config.restoreConfigFromLocalSettings(ctx, inputs, localSettings);
    assert.isTrue(res.isOk());
    assert.equal(localSettings.auth!.objectId, config.objectId);
    assert.equal(localSettings.auth!.clientSecret, config.password);
  });
  it("ProvisionConfig - restoreConfigFromLocalSettings - failure", async () => {
    const localSettings: v2.LocalSettings = {
      teamsApp: {},
      auth: {
        objectId: "mockObjectId",
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        oauth2PermissionScopeId: "mockOauth2PermissionScopeId",
      },
    };
    const config = new ProvisionConfig(true);
    const projectSettings = newProjectSettings();
    projectSettings.appName = randomAppName();
    const ctx = createV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const res = await config.restoreConfigFromLocalSettings(ctx, inputs, localSettings);
    assert.isTrue(res.isErr());
  });
  it("ProvisionConfig - restoreConfigFromEnvInfo - success", async () => {
    const envConfig: EnvConfig = {
      auth: {},
      manifest: {
        appName: {
          short: "myApp",
        },
      },
    };
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      config: envConfig,
      state: {
        solution: {},
        [BuiltInResourcePluginNames.aad]: {
          objectId: "mockObjectId",
          clientSecret: "mockClientSecret",
        },
      },
    };
    const aadResource = envInfo.state[BuiltInResourcePluginNames.aad] as v3.AADApp;
    const config = new ProvisionConfig(false);
    const projectSettings = newProjectSettings();
    projectSettings.appName = randomAppName();
    const ctx = createV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    sandbox.stub<any, any>(fs, "pathExists").resolves(true);
    sandbox.stub<any, any>(fs, "readJSON").resolves("");
    const res = await config.restoreConfigFromEnvInfo(ctx, inputs, envInfo);
    assert.isTrue(res.isOk());
    assert.equal(aadResource.objectId, config.objectId);
    assert.equal(aadResource.clientSecret, config.password);
  });

  it("ProvisionConfig - restoreConfigFromEnvInfo - failure", async () => {
    const envConfig: EnvConfig = {
      auth: {},
      manifest: {
        appName: {
          short: "myApp",
        },
      },
    };
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      config: envConfig,
      state: {
        solution: {},
        [BuiltInResourcePluginNames.aad]: {
          objectId: "mockObjectId",
          clientSecret: "mockClientSecret",
        },
      },
    };
    const config = new ProvisionConfig(false);
    const projectSettings = newProjectSettings();
    projectSettings.appName = randomAppName();
    const ctx = createV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const res = await config.restoreConfigFromEnvInfo(ctx, inputs, envInfo);
    assert.isTrue(res.isErr());
  });

  it("SetApplicationInContextConfig - restoreConfigFromLocalSettings - success", async () => {
    const localSettings: v2.LocalSettings = {
      teamsApp: {},
      auth: {
        objectId: "mockObjectId",
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        oauth2PermissionScopeId: "mockOauth2PermissionScopeId",
      },
      frontend: {
        tabDomain: "mydomain.com",
      },
      bot: {
        botId: uuid.v4(),
      },
    };
    const config = new SetApplicationInContextConfig(true);
    config.restoreConfigFromLocalSettings(localSettings);
    assert.equal(localSettings.bot!.botId, config.botId);
    assert.equal(localSettings.auth!.clientId, config.clientId);
    assert.equal(localSettings.frontend!.tabDomain, config.frontendDomain);
  });
  it("SetApplicationInContextConfig - restoreConfigFromLocalSettings - failure", async () => {
    const localSettings: v2.LocalSettings = {
      teamsApp: {},
      auth: {
        objectId: "mockObjectId",
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        oauth2PermissionScopeId: "mockOauth2PermissionScopeId",
      },
      frontend: {
        tabDomain: "mydomain.com",
      },
      bot: {
        botId: uuid.v4(),
      },
    };
    const config = new SetApplicationInContextConfig(true);
    try {
      config.restoreConfigFromLocalSettings(localSettings);
    } catch (e) {
      assert.isTrue(e.name === GetConfigError.name);
    }
  });
  it("SetApplicationInContextConfig - restoreConfigFromEnvInfo - success", async () => {
    const envConfig: EnvConfig = {
      auth: {},
      manifest: {
        appName: {
          short: "myApp",
        },
      },
    };
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      config: envConfig,
      state: {
        solution: {},
        [BuiltInResourcePluginNames.aad]: {
          objectId: "mockObjectId",
          clientId: "mockClientId",
          clientSecret: "mockClientSecret",
          oauth2PermissionScopeId: "mockOauth2PermissionScopeId",
        },
        [BuiltInResourcePluginNames.storage]: {
          domain: "mydomain.com",
        },
        [BuiltInResourcePluginNames.bot]: {
          botId: uuid.v4(),
        },
      },
    };
    const projectSettings = newProjectSettings();
    projectSettings.appName = randomAppName();
    projectSettings.solutionSettings!.modules = [
      {
        capabilities: ["Tab"],
        hostingPlugin: BuiltInResourcePluginNames.storage,
      },
      {
        capabilities: ["Bot"],
        hostingPlugin: BuiltInResourcePluginNames.bot,
      },
    ];
    const ctx = createV2Context(projectSettings);
    const config = new SetApplicationInContextConfig(false);
    config.restoreConfigFromEnvInfo(ctx, envInfo);
    assert.equal(envInfo.state[BuiltInResourcePluginNames.bot].botId, config.botId);
    assert.equal(envInfo.state[BuiltInResourcePluginNames.aad].clientId, config.clientId);
    assert.equal(envInfo.state[BuiltInResourcePluginNames.storage].domain, config.frontendDomain);
  });
  it("SetApplicationInContextConfig - restoreConfigFromEnvInfo - failure", async () => {
    const envConfig: EnvConfig = {
      auth: {},
      manifest: {
        appName: {
          short: "myApp",
        },
      },
    };
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      config: envConfig,
      state: {
        solution: {},
        [BuiltInResourcePluginNames.aad]: {
          objectId: "mockObjectId",
          clientId: "mockClientId",
          clientSecret: "mockClientSecret",
          oauth2PermissionScopeId: "mockOauth2PermissionScopeId",
        },
        [BuiltInResourcePluginNames.storage]: {
          domain: "mydomain.com",
        },
        [BuiltInResourcePluginNames.bot]: {
          botId: uuid.v4(),
        },
      },
    };
    const projectSettings = newProjectSettings();
    projectSettings.appName = randomAppName();
    projectSettings.solutionSettings!.modules = [
      {
        capabilities: ["Tab"],
        hostingPlugin: BuiltInResourcePluginNames.storage,
      },
      {
        capabilities: ["Bot"],
        hostingPlugin: BuiltInResourcePluginNames.bot,
      },
    ];
    const config = new SetApplicationInContextConfig(true);
    const ctx = createV2Context(projectSettings);
    try {
      config.restoreConfigFromEnvInfo(ctx, envInfo);
    } catch (e) {
      assert.isTrue(e.name === GetConfigError.name);
    }
  });

  it("PostProvisionConfig - restoreConfigFromLocalSettings - success", async () => {
    const localSettings: v2.LocalSettings = {
      teamsApp: {},
      auth: {
        objectId: "mockObjectId",
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        applicationIdUris: "https://oossyyy.com",
      },
      frontend: {
        tabDomain: "mydomain.com",
        tabEndpoint: "https://mydomain.com/tab",
      },
      bot: {
        botId: uuid.v4(),
        botEndpoint: "https://mydomain.com/bot",
      },
    };
    const config = new PostProvisionConfig(true);
    config.restoreConfigFromLocalSettings(localSettings);
    assert.equal(localSettings.frontend!.tabEndpoint, config.frontendEndpoint);
    assert.equal(localSettings.bot!.botEndpoint, config.botEndpoint);
    assert.equal(localSettings.auth!.applicationIdUris, config.applicationIdUri);
    assert.equal(localSettings.auth!.objectId, config.objectId);
    assert.equal(localSettings.auth!.clientId, config.clientId);
  });
  it("PostProvisionConfig - restoreConfigFromLocalSettings - failure", async () => {
    const localSettings: v2.LocalSettings = {
      teamsApp: {},
      auth: {
        objectId: "mockObjectId",
        clientSecret: "mockClientSecret",
      },
      frontend: {
        tabDomain: "https://mydomain.com",
      },
    };
    const config = new PostProvisionConfig(true);
    try {
      config.restoreConfigFromLocalSettings(localSettings);
    } catch (e) {
      assert.isTrue(e.name === GetConfigError.name);
    }
  });
  it("PostProvisionConfig - restoreConfigFromEnvInfo - success", async () => {
    const envConfig: EnvConfig = {
      auth: {},
      manifest: {
        appName: {
          short: "myApp",
        },
      },
    };
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      config: envConfig,
      state: {
        solution: {},
        [BuiltInResourcePluginNames.aad]: {
          objectId: "mockObjectId",
          clientId: "mockClientId",
          clientSecret: "mockClientSecret",
          applicationIdUris: "https://oossyyy.com",
        },
        [BuiltInResourcePluginNames.storage]: {
          domain: "mydomain.com",
          endpoint: "https://mydomain.com/tab",
        },
        [BuiltInResourcePluginNames.bot]: {
          botId: uuid.v4(),
          siteEndpoint: "https://mydomain.com/bot",
        },
      },
    };
    const projectSettings = newProjectSettings();
    projectSettings.appName = randomAppName();
    projectSettings.solutionSettings!.modules = [
      {
        capabilities: ["Tab"],
        hostingPlugin: BuiltInResourcePluginNames.storage,
      },
      {
        capabilities: ["Bot"],
        hostingPlugin: BuiltInResourcePluginNames.bot,
      },
    ];
    const ctx = createV2Context(projectSettings);
    const config = new PostProvisionConfig(true);
    config.restoreConfigFromEnvInfo(ctx, envInfo);
    assert.equal(
      envInfo.state[BuiltInResourcePluginNames.storage].endpoint,
      config.frontendEndpoint
    );
    assert.equal(envInfo.state[BuiltInResourcePluginNames.bot].siteEndpoint, config.botEndpoint);
    assert.equal(envInfo.state[BuiltInResourcePluginNames.aad].objectId, config.objectId);
    assert.equal(envInfo.state[BuiltInResourcePluginNames.aad].clientId, config.clientId);
  });
  it("PostProvisionConfig - restoreConfigFromEnvInfo - failure", async () => {
    const envConfig: EnvConfig = {
      auth: {},
      manifest: {
        appName: {
          short: "myApp",
        },
      },
    };
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      config: envConfig,
      state: {
        solution: {},
        [BuiltInResourcePluginNames.aad]: {
          objectId: "mockObjectId",
          clientId: "mockClientId",
          clientSecret: "mockClientSecret",
        },
        [BuiltInResourcePluginNames.storage]: {
          domain: "mydomain.com",
          endpoint: "https://mydomain.com/tab",
        },
        [BuiltInResourcePluginNames.bot]: {
          botId: uuid.v4(),
          siteEndpoint: "https://mydomain.com/bot",
        },
      },
    };
    const projectSettings = newProjectSettings();
    projectSettings.appName = randomAppName();
    projectSettings.solutionSettings!.modules = [
      {
        capabilities: ["Tab"],
        hostingPlugin: BuiltInResourcePluginNames.storage,
      },
      {
        capabilities: ["Bot"],
        hostingPlugin: BuiltInResourcePluginNames.bot,
      },
    ];
    const ctx = createV2Context(projectSettings);
    const config = new PostProvisionConfig(true);
    try {
      config.restoreConfigFromEnvInfo(ctx, envInfo);
    } catch (e) {
      assert.isTrue(e.name === GetConfigError.name);
    }
  });
});
