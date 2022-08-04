// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Wenyu Tang <wenyutang@microsoft.com>
 */

import path from "path";
import "mocha";
import * as chai from "chai";
import * as dotenv from "dotenv";
import { getTestFolder, getUniqueAppName, cleanUp } from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import * as fs from "fs-extra";
import mockedEnv from "mocked-env";

describe("Add Api Connection Tests V3", function () {
  let mockedEnvRestore: () => void;
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const commonInputs = "--component bot --endpoint https://localhost.test.com --alias test";
  const EnvPreFix = "TEAMSFX_API_";

  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_API_CONNECT_ENABLE: "true",
      TEAMSFX_APIV3: "true",
    });
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Bot);
  });
  afterEach(async () => {
    mockedEnvRestore();
    await cleanUp(appName, projectPath, false, false, false);
  });

  it("scaffold with basic auth", async () => {
    const basicInputs = "--user-name test123";
    // action
    await CliHelper.addApiConnection(projectPath, commonInputs, "basic", basicInputs);
    // assert
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", "test.js"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", ".env.teamsfx.local"))).to.be
      .true;
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", "package.json"))).to.be.true;

    const envs = dotenv.parse(
      await fs.readFile(path.join(projectPath, "bot", ".env.teamsfx.local"))
    );
    chai.assert.strictEqual(envs[EnvPreFix + "TEST_ENDPOINT"], "https://localhost.test.com");
    chai.assert.strictEqual(envs[EnvPreFix + "TEST_USERNAME"], "test123");
    chai.assert.exists(envs[EnvPreFix + "TEST_PASSWORD"]);

    const pkgFile = await fs.readJson(path.join(projectPath, "bot", "package.json"));
    const deps = pkgFile.dependencies;
    chai.assert.exists(deps["@microsoft/teamsfx"]);
  });

  it("scaffold with aad auth", async () => {
    const aadInputs =
      "--tenant-id 00000000-0000-0000-0000-000000000000 --app-id 11111111-1111-1111-1111-111111111111 --app-type custom";
    // action
    await CliHelper.addApiConnection(projectPath, commonInputs, "aad", aadInputs);
    // assert
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", "test.js"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", ".env.teamsfx.local"))).to.be
      .true;
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", "package.json"))).to.be.true;

    const envs = dotenv.parse(
      await fs.readFile(path.join(projectPath, "bot", ".env.teamsfx.local"))
    );
    chai.assert.strictEqual(envs[EnvPreFix + "TEST_ENDPOINT"], "https://localhost.test.com");
    chai.assert.strictEqual(
      envs[EnvPreFix + "TEST_TENANT_ID"],
      "00000000-0000-0000-0000-000000000000"
    );
    chai.assert.strictEqual(
      envs[EnvPreFix + "TEST_CLIENT_ID"],
      "11111111-1111-1111-1111-111111111111"
    );
    chai.assert.exists(envs[EnvPreFix + "TEST_CLIENT_SECRET"]);

    const pkgFile = await fs.readJson(path.join(projectPath, "bot", "package.json"));
    const deps = pkgFile.dependencies;
    chai.assert.exists(deps["@microsoft/teamsfx"]);
  });

  it("scaffold with apikey auth", async () => {
    const apiKeyInputs = "--key-location querystring --key-name fakename";
    // action
    await CliHelper.addApiConnection(projectPath, commonInputs, "apikey", apiKeyInputs);
    // assert
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", "test.js"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", ".env.teamsfx.local"))).to.be
      .true;
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", "package.json"))).to.be.true;

    const envs = dotenv.parse(
      await fs.readFile(path.join(projectPath, "bot", ".env.teamsfx.local"))
    );
    chai.assert.strictEqual(envs[EnvPreFix + "TEST_ENDPOINT"], "https://localhost.test.com");

    const pkgFile = await fs.readJson(path.join(projectPath, "bot", "package.json"));
    const deps = pkgFile.dependencies;
    chai.assert.exists(deps["@microsoft/teamsfx"]);
  });

  it("scaffold with cert auth", async () => {
    // action
    await CliHelper.addApiConnection(projectPath, commonInputs, "cert");
    // assert
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", "test.js"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", ".env.teamsfx.local"))).to.be
      .true;
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", "package.json"))).to.be.true;

    const envs = dotenv.parse(
      await fs.readFile(path.join(projectPath, "bot", ".env.teamsfx.local"))
    );
    chai.assert.strictEqual(envs[EnvPreFix + "TEST_ENDPOINT"], "https://localhost.test.com");

    const pkgFile = await fs.readJson(path.join(projectPath, "bot", "package.json"));
    const deps = pkgFile.dependencies;
    chai.assert.exists(deps["@microsoft/teamsfx"]);
  });

  it("scaffold with custom auth", async () => {
    // action
    await CliHelper.addApiConnection(projectPath, commonInputs, "custom");
    // assert
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", "test.js"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", ".env.teamsfx.local"))).to.be
      .true;
    chai.expect(await fs.pathExists(path.join(projectPath, "bot", "package.json"))).to.be.true;

    const envs = dotenv.parse(
      await fs.readFile(path.join(projectPath, "bot", ".env.teamsfx.local"))
    );
    chai.assert.strictEqual(envs[EnvPreFix + "TEST_ENDPOINT"], "https://localhost.test.com");

    const pkgFile = await fs.readJson(path.join(projectPath, "bot", "package.json"));
    const deps = pkgFile.dependencies;
    chai.assert.exists(deps["@microsoft/teamsfx"]);
  });
});
