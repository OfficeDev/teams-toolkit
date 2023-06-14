// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigFolderName,
  CryptoProvider,
  EnvConfig,
  EnvConfigFileNameTemplate,
  EnvNamePlaceholder,
  FxError,
  InputConfigsFolderName,
  Json,
  Result,
  ok,
  v3,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { ManifestVariables } from "../../src/common/constants";
import * as tools from "../../src/common/tools";
import { environmentManager } from "../../src/core/environment";
import { WriteFileError } from "../../src/error/common";
import { deleteFolder, randomAppName } from "./utils";

class MockCrypto implements CryptoProvider {
  private readonly encryptedValue: string;
  private readonly decryptedValue: string;

  constructor(encryptedValue: string, decryptedValue: string) {
    this.encryptedValue = encryptedValue;
    this.decryptedValue = decryptedValue;
  }

  public encrypt(plaintext: string): Result<string, FxError> {
    return ok(this.encryptedValue);
  }

  public decrypt(ciphertext: string): Result<string, FxError> {
    return ok(this.decryptedValue);
  }
}

describe("APIs of Environment Manager", () => {
  const sandbox = sinon.createSandbox();
  const appName = randomAppName();
  const projectPath = path.resolve(os.tmpdir(), appName);
  const fileMap = new Map<string, any>();
  const encryptedSecret = "secretOfLife";
  const decryptedValue = "42";
  const cryptoProvider = new MockCrypto(encryptedSecret, decryptedValue);
  const targetEnvName = "dev";
  const validEnvConfigData = {
    manifest: {
      appName: {
        short: appName,
      },
    },
  };
  const invalidEnvConfigData = {};

  const envConfigDataWithSecret = {
    manifest: {
      appName: {
        short: appName,
      },
    },
    auth: {
      accessAsUserScopeId: "test-scope-id",
      clientId: "test-client-id",
      clientSecret: `{{env-MOCKED_CLIENT_SECRET}}`,
      objectId: "test-object-id",
    },
  };

  const envStateDataWithoutCredential = {
    solution: {
      key: "value",
    },
  };
  const envStateDataWithCredential = {
    solution: {
      teamsAppTenantId: decryptedValue,
      key: "value",
    },
  };

  describe("Load Environment Config File", () => {
    beforeEach(async () => {
      await fs.ensureDir(projectPath);
    });

    afterEach(async () => {
      deleteFolder(projectPath);
    });

    after(async () => {
      sandbox.restore();
    });

    it("load valid environment config file without target env", async () => {
      await mockEnvConfigs(projectPath, validEnvConfigData);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(projectPath, cryptoProvider);
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment config.");
      }

      const envConfigInfo = actualEnvDataResult.value;
      assert.equal(envConfigInfo.envName, environmentManager.getDefaultEnvName());
      assert.isUndefined(envConfigInfo.config.azure);
      assert.equal(envConfigInfo.config.manifest.appName.short, appName);
    });

    it("load valid environment config file with target env", async () => {
      const envName = "test";
      await mockEnvConfigs(projectPath, validEnvConfigData, envName);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        envName
      );
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error occurs while loading environment config.");
      }

      const envConfigInfo = actualEnvDataResult.value;
      assert.equal(envConfigInfo.envName, envName);
      assert.isUndefined(envConfigInfo.config.azure);
      assert.equal(envConfigInfo.config.manifest.appName.short, appName);
    });

    it("load invalid environment config file", async () => {
      await mockEnvConfigs(projectPath, invalidEnvConfigData);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(projectPath, cryptoProvider);
      if (actualEnvDataResult.isErr()) {
        assert.equal(actualEnvDataResult.error.name, "InvalidEnvConfigError");
      } else {
        assert.fail("Failed to get expected error.");
      }
    });

    it("load environment config file with invalid subscription id", async () => {
      await mockEnvConfigs(projectPath, {
        manifest: {
          appName: {
            short: appName,
          },
        },
        azure: {
          subscriptionId: "invalid-subscription-id",
        },
      });

      const actualEnvDataResult = await environmentManager.loadEnvInfo(projectPath, cryptoProvider);
      if (actualEnvDataResult.isErr()) {
        assert.equal(actualEnvDataResult.error.name, "InvalidEnvConfigError");
      } else {
        assert.fail("Failed to get expected error.");
      }
    });

    it("load invalid JSON config file", async () => {
      const envName = environmentManager.getDefaultEnvName();
      const envConfigFile = environmentManager.getEnvConfigPath(envName, projectPath);
      await fs.ensureFile(envConfigFile);
      await fs.writeFile(envConfigFile, "not json");

      const actualEnvDataResult = await environmentManager.loadEnvInfo(projectPath, cryptoProvider);
      if (actualEnvDataResult.isErr()) {
        assert.equal(actualEnvDataResult.error.name, "InvalidEnvConfigError");
      } else {
        assert.fail("Failed to get expected error.");
      }
    });

    it("load environment config file with secret data", async () => {
      const secretValue = "mocked secret value";
      const mockedEnvRestore = mockedEnv({
        MOCKED_CLIENT_SECRET: secretValue,
      });

      const envName = "test";
      await mockEnvConfigs(projectPath, envConfigDataWithSecret, envName);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        envName
      );

      if (actualEnvDataResult.isErr()) {
        assert.fail("Error occurs while loading environment config.");
      }

      const envConfigInfo = actualEnvDataResult.value;
      assert.equal(envConfigInfo.envName, envName);
      const actualValue = envConfigInfo.config.auth?.clientSecret;
      assert.equal(actualValue, secretValue);

      mockedEnvRestore();
    });

    it("load non existent env name", async () => {
      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        "this does not exist"
      );
      if (actualEnvDataResult.isErr()) {
        assert.equal(actualEnvDataResult.error.name, "FileNotFoundError");
      } else {
        assert.fail("Failed to get expected error.");
      }
    });
  });

  describe("Load Environment State File", () => {
    const userData = {
      "solution.teamsAppTenantId": encryptedSecret,
    };

    before(async () => {
      sandbox.stub(tools, "dataNeedEncryption").returns(true);
    });

    beforeEach(async () => {
      await fs.ensureDir(projectPath);
    });

    afterEach(async () => {
      deleteFolder(projectPath);
    });

    after(async () => {
      sandbox.restore();
    });

    it("no userdata: load environment state without target env", async () => {
      await mockEnvStates(projectPath, envStateDataWithoutCredential);
      await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        undefined
      );
      if (actualEnvDataResult.isErr()) {
        // just throw the error so we get the error message and stack
        throw actualEnvDataResult.error;
      }

      const envInfo = actualEnvDataResult.value as v3.EnvInfoV3;
      assert.deepEqual(envInfo.state.solution, envStateDataWithoutCredential.solution);
    });

    it("no userdata: load environment state with target env", async () => {
      await mockEnvStates(projectPath, envStateDataWithoutCredential, targetEnvName);
      await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        targetEnvName
      );
      if (actualEnvDataResult.isErr()) {
        throw actualEnvDataResult.error;
      }

      const envInfo = actualEnvDataResult.value as v3.EnvInfoV3;
      assert.deepEqual(envInfo.state.solution, envStateDataWithoutCredential.solution);
    });

    it("with userdata: load environment state without target env", async () => {
      await mockEnvStates(projectPath, envStateDataWithCredential, undefined, userData);
      await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        undefined
      );
      if (actualEnvDataResult.isErr()) {
        throw actualEnvDataResult.error;
      }

      const envInfo = actualEnvDataResult.value as v3.EnvInfoV3;
      const expectedSolutionConfig = envStateDataWithCredential.solution as Record<string, string>;
      assert.equal(envInfo.state.solution.teamsAppTenantId, decryptedValue);
      assert.equal(envInfo.state.solution.key, expectedSolutionConfig.key);
    });

    it("with userdata: load environment state with target env", async () => {
      await mockEnvStates(projectPath, envStateDataWithCredential, targetEnvName, userData);
      await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        targetEnvName
      );
      if (actualEnvDataResult.isErr()) {
        throw actualEnvDataResult.error;
      }

      const envInfo = actualEnvDataResult.value as v3.EnvInfoV3;
      const expectedSolutionConfig = envStateDataWithCredential.solution as Record<string, string>;
      assert.equal(envInfo.state.solution.teamsAppTenantId, decryptedValue);
      assert.equal(envInfo.state.solution.key, expectedSolutionConfig.key);
    });

    it("with userdata: load environment state without target env", async () => {
      await mockEnvStates(projectPath, envStateDataWithCredential, undefined, {
        ...userData,
      });
      await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        undefined
      );
      if (actualEnvDataResult.isErr()) {
        throw actualEnvDataResult.error;
      }

      const envInfo = actualEnvDataResult.value as v3.EnvInfoV3;
      const expectedSolutionConfig = envStateDataWithCredential.solution as Record<string, string>;
      assert.equal(envInfo.state.solution.teamsAppTenantId, decryptedValue);
      assert.equal(envInfo.state.solution.key, expectedSolutionConfig.key);
    });

    it("with userdata (legacy project): load environment state with target env", async () => {
      await mockEnvStates(projectPath, envStateDataWithCredential, targetEnvName, userData);
      await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        targetEnvName
      );
      if (actualEnvDataResult.isErr()) {
        throw actualEnvDataResult.error;
      }

      const envInfo = actualEnvDataResult.value as v3.EnvInfoV3;
      const expectedSolutionConfig = envStateDataWithCredential.solution as Record<string, string>;
      assert.equal(envInfo.state.solution.teamsAppTenantId, decryptedValue);
      assert.equal(envInfo.state.solution.key, expectedSolutionConfig.key);
    });

    it("Environment state doesn't exist", async () => {
      await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);
      const actualEnvDataResult = await environmentManager.loadEnvInfo(projectPath, cryptoProvider);
      if (actualEnvDataResult.isErr()) {
        throw actualEnvDataResult.error;
      }
      assert.equal(actualEnvDataResult.value.envName, environmentManager.getDefaultEnvName());
    });
  });

  describe("Write Environment Config", () => {
    before(async () => {
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub<any, any>(fs, "writeFile").callsFake(async (file: string, data: any) => {
        fileMap.set(file, data);
      });
    });

    afterEach(async () => {
      fileMap.clear();
      deleteFolder(projectPath);
    });

    after(async () => {
      sandbox.restore();
    });

    it("write environment config without target env", async () => {
      const envConfig = environmentManager.newEnvConfigData(appName);
      const envConfigPathResult = await environmentManager.writeEnvConfig(projectPath, envConfig);
      if (envConfigPathResult.isErr()) {
        assert.fail("Failed to write environment config.");
      }

      assert.deepEqual(JSON.parse(fileMap.get(envConfigPathResult.value)), envConfig);
    });

    it("write environment config with target env", async () => {
      const envName = "test";
      const configName = EnvConfigFileNameTemplate.replace(EnvNamePlaceholder, envName);
      const envConfig = environmentManager.newEnvConfigData(appName);
      const envConfigPathResult = await environmentManager.writeEnvConfig(
        projectPath,
        envConfig,
        envName
      );
      if (envConfigPathResult.isErr()) {
        assert.fail("Failed to write environment config.");
      }

      assert.isTrue(envConfigPathResult.value.indexOf(configName) !== -1);
      const expectedContent = JSON.stringify(envConfig, null, 4);
      assert.equal(
        formatContent(fileMap.get(envConfigPathResult.value)),
        formatContent(expectedContent)
      );
    });
  });

  describe("WriteFileError", () => {
    afterEach(async () => {
      sandbox.restore();
    });
    it("writeEnvConfig throws WriteFileError", async () => {
      sandbox.stub<any, any>(fs, "pathExists").resolves(true);
      sandbox.stub<any, any>(environmentManager, "getEnvConfigsFolder").returns(ok("test"));
      sandbox.stub<any, any>(environmentManager, "getEnvConfigPath").returns("test");
      sandbox.stub<any, any>(fs, "writeFile").rejects(new Error());
      const envName = "test";
      const envConfig = environmentManager.newEnvConfigData(appName);
      const envConfigPathResult = await environmentManager.writeEnvConfig(
        projectPath,
        envConfig,
        envName
      );
      assert.isTrue(envConfigPathResult.isErr());
      if (envConfigPathResult.isErr()) {
        const truth = envConfigPathResult.error instanceof WriteFileError;
        assert.isTrue(truth);
      }
    });
  });

  describe("Check If File Is Environment Config", () => {
    const configFolder = path.resolve(projectPath, `.${ConfigFolderName}`, InputConfigsFolderName);

    it("correct env config", () => {
      const fileName = "config.test1.json";
      const isEnvConfig = environmentManager.isEnvConfig(
        projectPath,
        path.resolve(configFolder, fileName)
      );
      assert.isTrue(isEnvConfig);
    });

    it("file in incorrect folder", () => {
      const fileName = "config.test1.json";
      const isEnvConfig = environmentManager.isEnvConfig(projectPath, fileName);
      assert.isFalse(isEnvConfig);
    });

    it("file with incorrect name", () => {
      const fileName = "config.json";
      const isEnvConfig = environmentManager.isEnvConfig(
        projectPath,
        path.resolve(configFolder, fileName)
      );
      assert.isFalse(isEnvConfig);
    });
  });

  describe("Create New Environment Config", () => {
    const appName = "test";
    const basicConfig: EnvConfig = {
      $schema: environmentManager.schema,
      description: environmentManager.envConfigDescription,
      manifest: {
        appName: {
          short: appName,
          full: `Full name for ${appName}`,
        },
        description: {
          short: `Short description of ${appName}`,
          full: `Full description of ${appName}`,
        },
        icons: {
          color: "resources/color.png",
          outline: "resources/outline.png",
        },
      },
    };

    const configForExistingApp = Object.assign({}, basicConfig, {
      manifest: {
        ...basicConfig.manifest,
        [ManifestVariables.DeveloperWebsiteUrl]: "",
        [ManifestVariables.DeveloperPrivacyUrl]: "",
        [ManifestVariables.DeveloperTermsOfUseUrl]: "",
      },
    });

    it("create new env config for normal project", () => {
      const envConfig = environmentManager.newEnvConfigData(appName);
      assert.deepEqual(envConfig, basicConfig);
    });
  });
});

async function mockEnvStates(
  projectPath: string,
  envStateData: Json,
  envName?: string,
  userData?: Record<string, string>
) {
  envName = envName ?? environmentManager.getDefaultEnvName();
  const envFiles = environmentManager.getEnvStateFilesPath(envName, projectPath);

  await fs.ensureFile(envFiles.envState);
  await fs.writeJson(envFiles.envState, envStateData);

  if (userData) {
    await fs.ensureFile(envFiles.userDataFile);
    await fs.writeFile(envFiles.userDataFile, tools.serializeDict(userData));
  }
}

function formatContent(content: string) {
  return content.replace(/\r?\n/g, "\n");
}

async function mockEnvConfigs(projectPath: string, envConfigData: Json, envName?: string) {
  envName = envName ?? environmentManager.getDefaultEnvName();
  const envConfigFile = environmentManager.getEnvConfigPath(envName, projectPath);

  await fs.ensureFile(envConfigFile);
  await fs.writeJson(envConfigFile, envConfigData);
}
