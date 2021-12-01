// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { randomAppName } from "./utils";
import {
  ConfigFolderName,
  CryptoProvider,
  EnvConfigFileNameTemplate,
  EnvNamePlaceholder,
  FxError,
  InputConfigsFolderName,
  Json,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import { environmentManager, envPrefix } from "../../src/core/environment";
import * as tools from "../../src/common/tools";
import mockedEnv, { RestoreFn } from "mocked-env";
import { isMultiEnvEnabled } from "../../src/common/tools";
import sinon from "sinon";

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
      clientSecret: `{{${envPrefix}MOCKED_CLIENT_SECRET}}`,
      objectId: "test-object-id",
    },
  };

  const envStateDataObj = new Map([
    [
      "solution",
      {
        teamsAppTenantId: decryptedValue,
        key: "value",
      },
    ],
  ]);

  const envStateDataWithoutCredential = {
    key: "value",
  };
  const envStateDataWithCredential = {
    solution: {
      teamsAppTenantId: decryptedValue,
      key: "value",
    },
  };

  describe("Load Environment Config File", () => {
    // environment config exists only in multi-env
    if (!isMultiEnvEnabled()) {
      return;
    }
    beforeEach(async () => {
      await fs.ensureDir(projectPath);
    });

    afterEach(async () => {
      await fs.rmdir(projectPath, { recursive: true });
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
        assert.equal(actualEnvDataResult.error.name, "ProjectEnvNotExistError");
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
      await fs.rmdir(projectPath, { recursive: true });
    });

    after(async () => {
      sandbox.restore();
    });

    it("no userdata: load environment state without target env", async () => {
      await mockEnvStates(projectPath, envStateDataWithoutCredential);
      if (isMultiEnvEnabled()) {
        await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);
      }

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        undefined
      );
      if (actualEnvDataResult.isErr()) {
        // just throw the error so we get the error message and stack
        throw actualEnvDataResult.error;
      }

      const envInfo = actualEnvDataResult.value;
      assert.equal(envInfo.state.get("key"), envStateDataWithoutCredential.key);
    });

    it("no userdata: load environment state with target env", async () => {
      await mockEnvStates(projectPath, envStateDataWithoutCredential, targetEnvName);
      if (isMultiEnvEnabled()) {
        await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);
      }

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        targetEnvName
      );
      if (actualEnvDataResult.isErr()) {
        throw actualEnvDataResult.error;
      }

      const envInfo = actualEnvDataResult.value;
      assert.equal(envInfo.state.get("key"), envStateDataWithoutCredential.key);
    });

    it("with userdata: load environment state without target env", async () => {
      await mockEnvStates(projectPath, envStateDataWithCredential, undefined, userData);
      if (isMultiEnvEnabled()) {
        await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);
      }

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        undefined
      );
      if (actualEnvDataResult.isErr()) {
        throw actualEnvDataResult.error;
      }

      const envInfo = actualEnvDataResult.value;
      const expectedSolutionConfig = envStateDataWithCredential.solution as Record<string, string>;
      assert.equal(envInfo.state.get("solution").get("teamsAppTenantId"), decryptedValue);
      assert.equal(envInfo.state.get("solution").get("key"), expectedSolutionConfig.key);
    });

    it("with userdata: load environment state with target env", async () => {
      await mockEnvStates(projectPath, envStateDataWithCredential, targetEnvName, userData);
      if (isMultiEnvEnabled()) {
        await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);
      }

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        targetEnvName
      );
      if (actualEnvDataResult.isErr()) {
        throw actualEnvDataResult.error;
      }

      const envInfo = actualEnvDataResult.value;
      const expectedSolutionConfig = envStateDataWithCredential.solution as Record<string, string>;
      assert.equal(envInfo.state.get("solution").get("teamsAppTenantId"), decryptedValue);
      assert.equal(envInfo.state.get("solution").get("key"), expectedSolutionConfig.key);
    });

    it("with userdata: load environment state without target env", async () => {
      await mockEnvStates(projectPath, envStateDataWithCredential, undefined, {
        ...userData,
      });
      if (isMultiEnvEnabled()) {
        await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);
      }

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        undefined
      );
      if (actualEnvDataResult.isErr()) {
        throw actualEnvDataResult.error;
      }

      const envInfo = actualEnvDataResult.value;
      const expectedSolutionConfig = envStateDataWithCredential.solution as Record<string, string>;
      assert.equal(envInfo.state.get("solution").get("teamsAppTenantId"), decryptedValue);
      assert.equal(envInfo.state.get("solution").get("key"), expectedSolutionConfig.key);
    });

    it("with userdata (legacy project): load environment state with target env", async () => {
      await mockEnvStates(projectPath, envStateDataWithCredential, targetEnvName, userData);
      if (isMultiEnvEnabled()) {
        await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);
      }

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        cryptoProvider,
        targetEnvName
      );
      if (actualEnvDataResult.isErr()) {
        throw actualEnvDataResult.error;
      }

      const envInfo = actualEnvDataResult.value;
      const expectedSolutionConfig = envStateDataWithCredential.solution as Record<string, string>;
      assert.equal(envInfo.state.get("solution").get("teamsAppTenantId"), decryptedValue);
      assert.equal(envInfo.state.get("solution").get("key"), expectedSolutionConfig.key);
    });

    it("Environment state doesn't exist", async () => {
      if (isMultiEnvEnabled()) {
        await mockEnvConfigs(projectPath, validEnvConfigData, targetEnvName);
      }
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
      await fs.rmdir(projectPath, { recursive: true });
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

  describe("Write Environment State", () => {
    before(async () => {
      sandbox.stub(tools, "dataNeedEncryption").returns(true);
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub<any, any>(fs, "writeFile").callsFake(async (file: string, data: any) => {
        fileMap.set(file, data);
      });
    });

    afterEach(async () => {
      fileMap.clear();
      await fs.rmdir(projectPath, { recursive: true });
    });

    after(async () => {
      sandbox.restore();
    });

    it("no userdata: write environment state without target env", async () => {
      await environmentManager.writeEnvState(
        tools.objectToMap(envStateDataWithoutCredential),
        projectPath,
        cryptoProvider
      );
      const envFiles = environmentManager.getEnvStateFilesPath(
        environmentManager.getDefaultEnvName(),
        projectPath
      );

      const expectedEnvStateContent = JSON.stringify(envStateDataWithoutCredential, null, 4);
      assert.deepEqual(JSON.parse(fileMap.get(envFiles.envState)), envStateDataWithoutCredential);
      assert.equal(fileMap.get(envFiles.userDataFile), "");
    });

    it("no userdata: write environment state with target env", async () => {
      await environmentManager.writeEnvState(
        tools.objectToMap(envStateDataWithoutCredential),
        projectPath,
        cryptoProvider,
        targetEnvName
      );
      const envFiles = environmentManager.getEnvStateFilesPath(targetEnvName, projectPath);

      const expectedEnvStateContent = JSON.stringify(envStateDataWithoutCredential, null, 4);
      assert.equal(
        formatContent(fileMap.get(envFiles.envState)),
        formatContent(expectedEnvStateContent)
      );
      assert.equal(fileMap.get(envFiles.userDataFile), "");
    });

    it("with userdata: write environment state without target env", async () => {
      await environmentManager.writeEnvState(
        envStateDataObj,
        projectPath,
        cryptoProvider,
        undefined
      );
      const envFiles = environmentManager.getEnvStateFilesPath(
        environmentManager.getDefaultEnvName(),
        projectPath
      );

      assert.deepEqual(JSON.parse(fileMap.get(envFiles.envState)), envStateDataWithCredential);
    });

    it("with userdata: write environment state with target env", async () => {
      await environmentManager.writeEnvState(
        envStateDataObj,
        projectPath,
        cryptoProvider,
        targetEnvName
      );
      const envFiles = environmentManager.getEnvStateFilesPath(targetEnvName, projectPath);

      const expectedEnvStateContent = JSON.stringify(envStateDataWithCredential, null, 4);
      assert.equal(
        formatContent(fileMap.get(envFiles.envState)),
        formatContent(expectedEnvStateContent)
      );
    });
  });

  describe("List Environment Configs", () => {
    const configFolder = path.resolve(projectPath, `.${ConfigFolderName}`, InputConfigsFolderName);

    beforeEach(async () => {
      await fs.ensureDir(configFolder);
    });

    afterEach(async () => {
      await fs.rmdir(projectPath, { recursive: true });
    });

    it("list all the env configs with correct naming convention", async () => {
      const envFileNames = [
        // correct env file names
        "config.default.json",
        "config.42.JSON",
        "config.dev1.json",
        "CONFIG.dev2.JSON",
        "CONFIG.dev_1.JSON",
        "CONFIG.stage-42.json",
        // incorrect env file names
        "config..json",
        "config. .json",
        "config.4 2.json",
        "config.+.json",
        "config.=.json",
      ];

      for (const envFileName of envFileNames) {
        await fs.ensureFile(path.resolve(configFolder, envFileName));
      }

      const envNamesResult = await environmentManager.listEnvConfigs(projectPath);
      if (envNamesResult.isErr()) {
        assert.fail("Fail to get the list of env configs.");
      }

      assert.sameMembers(envNamesResult.value, [
        "default",
        "dev1",
        "dev2",
        "42",
        "dev_1",
        "stage-42",
      ]);
    });

    it("no env state found", async () => {
      const envNamesResult = await environmentManager.listEnvConfigs(projectPath);
      if (envNamesResult.isErr()) {
        assert.fail("Fail to get the list of env configs.");
      }

      assert.isEmpty(envNamesResult.value);
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
