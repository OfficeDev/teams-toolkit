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
  const encreptedSecret = "secretOfLife";
  const decryptedValue = "42";
  const cryptoProvider = new MockCrypto(encreptedSecret, decryptedValue);
  const targetEnvName = "dev";
  const envDataWithoutCredential: Json = {
    key: "value",
  };
  const envDataWithCredential: Json = {
    solution: {
      teamsAppTenantId: "{{solution.teamsAppTenantId}}",
      key: "value",
    },
  };
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
    assert.equal(envInfo.data.key, envDataWithoutCredential.key);
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
    assert.equal(envInfo.data.key, envDataWithoutCredential.key);
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
    const actualSolutionConfig = envInfo.data.solution as Record<string, string>;
    const expectedSolutionConfig = envDataWithCredential.solution as Record<string, string>;
    assert.equal(actualSolutionConfig.teamsAppTenantId, decryptedValue);
    assert.equal(actualSolutionConfig.key, expectedSolutionConfig.key);
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
    const actualSolutionConfig = envInfo.data.solution as Record<string, string>;
    const expectedSolutionConfig = envDataWithCredential.solution as Record<string, string>;
    assert.equal(actualSolutionConfig.teamsAppTenantId, decryptedValue);
    assert.equal(actualSolutionConfig.key, expectedSolutionConfig.key);
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
    const actualSolutionConfig = envInfo.data.solution as Record<string, string>;
    const expectedSolutionConfig = envDataWithCredential.solution as Record<string, string>;
    assert.equal(actualSolutionConfig.teamsAppTenantId, encreptedSecret);
    assert.equal(actualSolutionConfig.key, expectedSolutionConfig.key);
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
