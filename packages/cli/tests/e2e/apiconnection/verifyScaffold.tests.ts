// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import { getTestFolder, getUniqueAppName, cleanUp } from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import * as fs from "fs-extra";
import mockedEnv from "mocked-env";

describe("Add Api Connection Tests", function () {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: () => void;
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const commonInputs = "--component bot --endpoint https://localhost.test.com --name test";

  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_API_CONNECT_ENABLE: "true",
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
    const files = await fs.readdir(path.join(projectPath, "bot"));
    console.log(files);
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", "test.js"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", ".env.teamsfx.local"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", "package.json"))).to.be.true;
  });

  it("scaffold with aad auth", async () => {
    const aadInputs = "--app-tenant-id fake-tenant-id --app-id fake-app-id";
    // action
    await CliHelper.addApiConnection(projectPath, commonInputs, "aad", aadInputs);
    // assert
    const files = await fs.readdir(path.join(projectPath, "bot"));
    console.log(files);

    chai.expect(await fs.pathExists(path.join(testFolder, "bot", "test.js"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", ".env.teamsfx.local"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", "package.json"))).to.be.true;
  });

  it("scaffold with apiKey auth", async () => {
    const apiKeyInputs = "--key-location query --key-name fakename";
    // action
    await CliHelper.addApiConnection(projectPath, commonInputs, "apiKey", apiKeyInputs);
    // assert
    const files = await fs.readdir(path.join(projectPath, "bot"));
    console.log(files);
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", "test.js"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", ".env.teamsfx.local"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", "package.json"))).to.be.true;
  });

  it("scaffold with cert auth", async () => {
    // action
    await CliHelper.addApiConnection(projectPath, commonInputs, "cert");
    // assert
    const files = await fs.readdir(path.join(projectPath, "bot"));
    console.log(files);
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", "test.js"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", ".env.teamsfx.local"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", "package.json"))).to.be.true;
  });

  it("scaffold with custom auth", async () => {
    // action
    await CliHelper.addApiConnection(projectPath, commonInputs, "custom");
    // assert
    const files = await fs.readdir(path.join(projectPath, "bot"));
    console.log(files);
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", "test.js"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", ".env.teamsfx.local"))).to.be.true;
    chai.expect(await fs.pathExists(path.join(testFolder, "bot", "package.json"))).to.be.true;
  });
});
