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
        accessAsUserScopeId: "mockAccessAsUserScopeId",
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
        accessAsUserScopeId: "mockAccessAsUserScopeId",
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
        accessAsUserScopeId: "mockAccessAsUserScopeId",
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

  it("SetApplicationInContextConfig - restoreConfigFromLocalSettings - success", async () => {
    const localSettings: v2.LocalSettings = {
      teamsApp: {},
      auth: {
        objectId: "mockObjectId",
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        accessAsUserScopeId: "mockAccessAsUserScopeId",
      },
      bot: {
        botId: "mockBotId",
      },
    };
    const config = new SetApplicationInContextConfig(true);
    config.restoreConfigFromLocalSettings(localSettings);
    assert.equal(localSettings.bot!.botId, config.botId);
    assert.equal(localSettings.auth!.clientId, config.clientId);
  });

  it("SetApplicationInContextConfig - restoreConfigFromLocalSettings - failure", async () => {
    const localSettings: v2.LocalSettings = {
      teamsApp: {},
      auth: {
        objectId: "mockObjectId",
        clientSecret: "mockClientSecret",
        accessAsUserScopeId: "mockAccessAsUserScopeId",
      },
    };
    const config = new SetApplicationInContextConfig(true);
    try {
      config.restoreConfigFromLocalSettings(localSettings);
    } catch (e) {
      assert.isTrue(e.name === GetConfigError.name);
    }
  });
});
