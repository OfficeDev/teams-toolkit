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
import { environmentManager } from "../../src/core/environment";
import * as tools from "../../src/common/tools";
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
  const encreptedSecret = "secretOfLife";
  const decryptedValue = "42";
  const cryptoProvider = new MockCrypto(encreptedSecret, decryptedValue);
  const targetEnvName = "dev";
  const validEnvConfigData = {
    azure: {},
    manifest: {
      description: "",
      values: {},
    },
  };
  const invalidEnvConfigData = {};

  const envProfileDataObj = new Map([
    [
      "solution",
      {
        teamsAppTenantId: decryptedValue,
        key: "value",
      },
    ],
  ]);

  const envProfileDataWithoutCredential = {
    key: "value",
  };
  const envProfileDataWithCredential = {
    solution: {
      teamsAppTenantId: "{{solution.teamsAppTenantId}}",
      key: "value",
    },
  };

  describe("Load Environment Config File", () => {
    before(async () => {
      sandbox.stub(tools, "isMultiEnvEnabled").returns(true);
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

    it("load valid environment config file without target env", async () => {
      await mockEnvConfigs(projectPath, validEnvConfigData);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(projectPath);
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment config.");
      }

      const envConfigInfo = actualEnvDataResult.value;
      assert.equal(envConfigInfo.envName, environmentManager.getDefaultEnvName());
      assert.isEmpty(envConfigInfo.config.azure);
      assert.equal(envConfigInfo.config.manifest.description, "");
      assert.isEmpty(envConfigInfo.config.manifest.values);
    });

    it("load valid environment config file with target env", async () => {
      const envName = "test";
      await mockEnvConfigs(projectPath, validEnvConfigData, envName);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(projectPath, envName);
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment config.");
      }

      const envConfigInfo = actualEnvDataResult.value;
      assert.equal(envConfigInfo.envName, envName);
      assert.isEmpty(envConfigInfo.config.azure);
      assert.equal(envConfigInfo.config.manifest.description, "");
      assert.isEmpty(envConfigInfo.config.manifest.values);
    });

    it("load invalid enviornment config file", async () => {
      await mockEnvConfigs(projectPath, invalidEnvConfigData);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(projectPath);
      if (actualEnvDataResult.isErr()) {
        assert.equal(actualEnvDataResult.error.message, "InvalidEnvConfigError");
      } else {
        assert.fail("Failed to get expected error.");
      }
    });
  });

  describe("Load Environment Profile File", () => {
    const userData = {
      "solution.teamsAppTenantId": encreptedSecret,
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

    it("no userdata: load environment profile without target env", async () => {
      await mockEnvProfiles(projectPath, envProfileDataWithoutCredential);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        undefined,
        cryptoProvider
      );
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment profile.");
      }

      const envInfo = actualEnvDataResult.value;
      assert.equal(envInfo.profile.get("key"), envProfileDataWithoutCredential.key);
    });

    it("no userdata: load environment profile with target env", async () => {
      await mockEnvProfiles(projectPath, envProfileDataWithoutCredential, targetEnvName);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        targetEnvName,
        cryptoProvider
      );
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment profile.");
      }

      const envInfo = actualEnvDataResult.value;
      assert.equal(envInfo.profile.get("key"), envProfileDataWithoutCredential.key);
    });

    it("with userdata: load environment profile without target env", async () => {
      await mockEnvProfiles(projectPath, envProfileDataWithCredential, undefined, userData);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        undefined,
        cryptoProvider
      );
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment profile.");
      }

      const envInfo = actualEnvDataResult.value;
      const expectedSolutionConfig = envProfileDataWithCredential.solution as Record<
        string,
        string
      >;
      assert.equal(envInfo.profile.get("solution").get("teamsAppTenantId"), decryptedValue);
      assert.equal(envInfo.profile.get("solution").get("key"), expectedSolutionConfig.key);
    });

    it("with userdata: load environment profile with target env", async () => {
      await mockEnvProfiles(projectPath, envProfileDataWithCredential, targetEnvName, userData);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        targetEnvName,
        cryptoProvider
      );
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment profile.");
      }

      const envInfo = actualEnvDataResult.value;
      const expectedSolutionConfig = envProfileDataWithCredential.solution as Record<
        string,
        string
      >;
      assert.equal(envInfo.profile.get("solution").get("teamsAppTenantId"), decryptedValue);
      assert.equal(envInfo.profile.get("solution").get("key"), expectedSolutionConfig.key);
    });

    it("with userdata (has checksum): load environment profile without target env", async () => {
      await mockEnvProfiles(projectPath, envProfileDataWithCredential, undefined, {
        ...userData,
        _checksum: "81595a4344a4345ecfd90232f9e3540ce2b72e50745b3b83adc484c8e5055a33",
      });

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        undefined,
        cryptoProvider
      );
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment profile.");
      }

      const envInfo = actualEnvDataResult.value;
      const expectedSolutionConfig = envProfileDataWithCredential.solution as Record<
        string,
        string
      >;
      assert.equal(envInfo.profile.get("solution").get("teamsAppTenantId"), decryptedValue);
      assert.equal(envInfo.profile.get("solution").get("key"), expectedSolutionConfig.key);
    });

    it("with userdata (corrupted): load environment profile without target env", async () => {
      await mockEnvProfiles(projectPath, envProfileDataWithCredential, undefined, {
        "solution.teamsAppTenantId": "corrupted",
        _checksum: "81595a4344a4345ecfd90232f9e3540ce2b72e50745b3b83adc484c8e5055a33",
      });

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        undefined,
        cryptoProvider
      );
      if (actualEnvDataResult.isErr()) {
        assert.equal(actualEnvDataResult.error.message, "CorruptedSecretError");
      }
    });

    it("with userdata (legacy project): load environment profile with target env", async () => {
      await mockEnvProfiles(projectPath, envProfileDataWithCredential, targetEnvName, userData);

      const actualEnvDataResult = await environmentManager.loadEnvInfo(
        projectPath,
        targetEnvName,
        undefined
      );
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment profile.");
      }

      const envInfo = actualEnvDataResult.value;
      const expectedSolutionConfig = envProfileDataWithCredential.solution as Record<
        string,
        string
      >;
      assert.equal(envInfo.profile.get("solution").get("teamsAppTenantId"), encreptedSecret);
      assert.equal(envInfo.profile.get("solution").get("key"), expectedSolutionConfig.key);
    });

    it("environment profile doesn't exist", async () => {
      const actualEnvDataResult = await environmentManager.loadEnvInfo(projectPath);
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment profile.");
      }
      assert.equal(actualEnvDataResult.value.envName, "default");
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
      const envConfig = environmentManager.newEnvConfigData();
      const envConfigPathResult = await environmentManager.writeEnvConfig(projectPath, envConfig);
      if (envConfigPathResult.isErr()) {
        assert.fail("Failed to write environment config.");
      }

      const expectedContent = JSON.stringify(envConfig, null, 4);
      assert.equal(
        formatContent(fileMap.get(envConfigPathResult.value)),
        formatContent(expectedContent)
      );
    });

    it("write environment config with target env", async () => {
      const envName = "test";
      const configName = EnvConfigFileNameTemplate.replace(EnvNamePlaceholder, envName);
      const envConfig = environmentManager.newEnvConfigData();
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

  describe("Write Environment Profile", () => {
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

    it("no userdata: write environment profile without target env", async () => {
      await environmentManager.writeEnvProfile(
        tools.objectToMap(envProfileDataWithoutCredential),
        projectPath
      );
      const envFiles = environmentManager.getEnvProfileFilesPath("default", projectPath);

      const expectedEnvProfileContent = JSON.stringify(envProfileDataWithoutCredential, null, 4);
      assert.equal(
        formatContent(fileMap.get(envFiles.envProfile)),
        formatContent(expectedEnvProfileContent)
      );
      assert.equal(fileMap.get(envFiles.userDataFile), "");
    });

    it("no userdata: write environment profile with target env", async () => {
      await environmentManager.writeEnvProfile(
        tools.objectToMap(envProfileDataWithoutCredential),
        projectPath,
        targetEnvName
      );
      const envFiles = environmentManager.getEnvProfileFilesPath(targetEnvName, projectPath);

      const expectedEnvProfileContent = JSON.stringify(envProfileDataWithoutCredential, null, 4);
      assert.equal(
        formatContent(fileMap.get(envFiles.envProfile)),
        formatContent(expectedEnvProfileContent)
      );
      assert.equal(fileMap.get(envFiles.userDataFile), "");
    });

    it("with userdata: write environment profile without target env", async () => {
      await environmentManager.writeEnvProfile(
        envProfileDataObj,
        projectPath,
        undefined,
        cryptoProvider
      );
      const envFiles = environmentManager.getEnvProfileFilesPath("default", projectPath);

      const expectedEnvProfileContent = JSON.stringify(envProfileDataWithCredential, null, 4);
      const expectedUserDataFileContent = `solution.teamsAppTenantId=${encreptedSecret}\n_checksum=81595a4344a4345ecfd90232f9e3540ce2b72e50745b3b83adc484c8e5055a33`;
      assert.equal(
        formatContent(fileMap.get(envFiles.envProfile)),
        formatContent(expectedEnvProfileContent)
      );
      assert.equal(
        formatContent(fileMap.get(envFiles.userDataFile)),
        formatContent(expectedUserDataFileContent)
      );
    });

    it("with userdata: write environment profile with target env", async () => {
      await environmentManager.writeEnvProfile(
        envProfileDataObj,
        projectPath,
        targetEnvName,
        cryptoProvider
      );
      const envFiles = environmentManager.getEnvProfileFilesPath(targetEnvName, projectPath);

      const expectedEnvProfileContent = JSON.stringify(envProfileDataWithCredential, null, 4);
      const expectedUserDataFileContent = `solution.teamsAppTenantId=${encreptedSecret}\n_checksum=81595a4344a4345ecfd90232f9e3540ce2b72e50745b3b83adc484c8e5055a33`;
      assert.equal(
        formatContent(fileMap.get(envFiles.envProfile)),
        formatContent(expectedEnvProfileContent)
      );
      assert.equal(
        formatContent(fileMap.get(envFiles.userDataFile)),
        formatContent(expectedUserDataFileContent)
      );
    });
  });

  describe("List Environment configs", () => {
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

    it("no env profile found", async () => {
      const envNamesResult = await environmentManager.listEnvConfigs(projectPath);
      if (envNamesResult.isErr()) {
        assert.fail("Fail to get the list of env configs.");
      }

      assert.isEmpty(envNamesResult.value);
    });
  });
});

async function mockEnvProfiles(
  projectPath: string,
  envProfileData: Json,
  envName?: string,
  userData?: Record<string, string>
) {
  envName = envName ?? environmentManager.getDefaultEnvName();
  const envFiles = environmentManager.getEnvProfileFilesPath(envName, projectPath);

  await fs.ensureFile(envFiles.envProfile);
  await fs.writeJson(envFiles.envProfile, envProfileData);

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
