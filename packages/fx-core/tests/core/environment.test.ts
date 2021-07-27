// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { randomAppName } from "./utils";
import { Json, ok } from "@microsoft/teamsfx-api";
import { environmentManager } from "../../src/core/environment";
import { LocalCrypto } from "../../src/core/crypto";
import * as tools from "../../src/common/tools";

describe("APIs of Environment Manager", () => {
  const sandbox = sinon.createSandbox();
  const appName = randomAppName();
  const projectPath = path.resolve(os.tmpdir(), appName);
  const cryptoProvider = new LocalCrypto("mocked-project-id");
  const mockedSecretValue = "42";
  const encreptedSecret = "encreptedSecret";
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
    sandbox.stub(cryptoProvider, "decrypt").returns(ok(mockedSecretValue));
    sandbox.stub(tools, "dataNeedEncryption").returns(true);
  });

  after(async () => {
    sandbox.restore();
  });

  afterEach(async () => {
    await fs.rmdir(projectPath, { recursive: true });
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
    assert.equal(actualSolutionConfig.teamsAppTenantId, mockedSecretValue);
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
    assert.equal(actualSolutionConfig.teamsAppTenantId, mockedSecretValue);
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
