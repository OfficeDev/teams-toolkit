// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { randomAppName } from "./utils";
import { CryptoProvider, FxError, Json, ok, Result, UserError } from "@microsoft/teamsfx-api";
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
  const envDataObj = new Map([
    [
      "solution",
      {
        teamsAppTenantId: decryptedValue,
        key: "value",
      },
    ],
  ]);

  const envDataWithoutCredential = {
    key: "value",
  };
  const envDataWithCredential = {
    solution: {
      teamsAppTenantId: "{{solution.teamsAppTenantId}}",
      key: "value",
    },
  };

  describe("Load Environment Profile", () => {
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
      await mockEnvProfiles(projectPath, envDataWithoutCredential);

      const actualEnvDataResult = await environmentManager.loadEnvProfile(
        projectPath,
        undefined,
        cryptoProvider
      );
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment profile.");
      }

      const envInfo = actualEnvDataResult.value;
      assert.equal(envInfo.data.get("key"), envDataWithoutCredential.key);
    });

    it("no userdata: load environment profile with target env", async () => {
      await mockEnvProfiles(projectPath, envDataWithoutCredential, targetEnvName);

      const actualEnvDataResult = await environmentManager.loadEnvProfile(
        projectPath,
        targetEnvName,
        cryptoProvider
      );
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment profile.");
      }

      const envInfo = actualEnvDataResult.value;
      assert.equal(envInfo.data.get("key"), envDataWithoutCredential.key);
    });

    it("with userdata: load environment profile without target env", async () => {
      await mockEnvProfiles(projectPath, envDataWithCredential, undefined, userData);

      const actualEnvDataResult = await environmentManager.loadEnvProfile(
        projectPath,
        undefined,
        cryptoProvider
      );
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment profile.");
      }

      const envInfo = actualEnvDataResult.value;
      const expectedSolutionConfig = envDataWithCredential.solution as Record<string, string>;
      assert.equal(envInfo.data.get("solution").get("teamsAppTenantId"), decryptedValue);
      assert.equal(envInfo.data.get("solution").get("key"), expectedSolutionConfig.key);
    });

    it("with userdata: load environment profile with target env", async () => {
      await mockEnvProfiles(projectPath, envDataWithCredential, targetEnvName, userData);

      const actualEnvDataResult = await environmentManager.loadEnvProfile(
        projectPath,
        targetEnvName,
        cryptoProvider
      );
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment profile.");
      }

      const envInfo = actualEnvDataResult.value;
      const expectedSolutionConfig = envDataWithCredential.solution as Record<string, string>;
      assert.equal(envInfo.data.get("solution").get("teamsAppTenantId"), decryptedValue);
      assert.equal(envInfo.data.get("solution").get("key"), expectedSolutionConfig.key);
    });

    it("with userdata (legacy project): load environment profile with target env", async () => {
      await mockEnvProfiles(projectPath, envDataWithCredential, targetEnvName, userData);

      const actualEnvDataResult = await environmentManager.loadEnvProfile(
        projectPath,
        targetEnvName,
        undefined
      );
      if (actualEnvDataResult.isErr()) {
        assert.fail("Error ocurrs while loading environment profile.");
      }

      const envInfo = actualEnvDataResult.value;
      const expectedSolutionConfig = envDataWithCredential.solution as Record<string, string>;
      assert.equal(envInfo.data.get("solution").get("teamsAppTenantId"), encreptedSecret);
      assert.equal(envInfo.data.get("solution").get("key"), expectedSolutionConfig.key);
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
        tools.objectToMap(envDataWithoutCredential),
        projectPath
      );
      const envFiles = environmentManager.getEnvFilesPath("default", projectPath);

      const expectedEnvProfileContent = JSON.stringify(envDataWithoutCredential, null, 4);
      assert.equal(
        formatContent(fileMap.get(envFiles.envProfile)),
        formatContent(expectedEnvProfileContent)
      );
      assert.equal(fileMap.get(envFiles.userDataFile), "");
    });

    it("no userdata: write environment profile with target env", async () => {
      await environmentManager.writeEnvProfile(
        tools.objectToMap(envDataWithoutCredential),
        projectPath,
        targetEnvName
      );
      const envFiles = environmentManager.getEnvFilesPath(targetEnvName, projectPath);

      const expectedEnvProfileContent = JSON.stringify(envDataWithoutCredential, null, 4);
      assert.equal(
        formatContent(fileMap.get(envFiles.envProfile)),
        formatContent(expectedEnvProfileContent)
      );
      assert.equal(fileMap.get(envFiles.userDataFile), "");
    });

    it("with userdata: write environment profile without target env", async () => {
      await environmentManager.writeEnvProfile(envDataObj, projectPath, undefined, cryptoProvider);
      const envFiles = environmentManager.getEnvFilesPath("default", projectPath);

      const expectedEnvProfileContent = JSON.stringify(envDataWithCredential, null, 4);
      const expectedUserDataFileContent = `solution.teamsAppTenantId=${encreptedSecret}`;
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
        envDataObj,
        projectPath,
        targetEnvName,
        cryptoProvider
      );
      const envFiles = environmentManager.getEnvFilesPath(targetEnvName, projectPath);

      const expectedEnvProfileContent = JSON.stringify(envDataWithCredential, null, 4);
      const expectedUserDataFileContent = `solution.teamsAppTenantId=${encreptedSecret}`;
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

  it("expected error: environment profile doesn't exist", async () => {
    const actualEnvDataResult = await environmentManager.loadEnvProfile(projectPath);
    assert.isTrue(actualEnvDataResult.isErr());
    actualEnvDataResult.mapErr((error) => {
      assert.instanceOf(error, UserError);
      assert.isTrue(error.name === "PathNotExist");
    });
  });
});

async function mockEnvProfiles(
  projectPath: string,
  envData: Json,
  envName?: string,
  userData?: Record<string, string>
) {
  envName = envName ?? "default";
  const envFiles = environmentManager.getEnvFilesPath(envName, projectPath);

  await fs.ensureFile(envFiles.envProfile);
  await fs.writeJson(envFiles.envProfile, envData);

  if (userData) {
    await fs.ensureFile(envFiles.userDataFile);
    await fs.writeFile(envFiles.userDataFile, tools.serializeDict(userData));
  }
}

function formatContent(content: string) {
  return content.replace(/\r?\n/g, "\n");
}
