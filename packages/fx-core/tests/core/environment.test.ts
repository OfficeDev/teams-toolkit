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
