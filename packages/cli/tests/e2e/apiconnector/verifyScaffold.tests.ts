// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import "mocha";
import { expect } from "chai";
import { getTestFolder, getUniqueAppName, cleanUp } from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import * as fs from "fs-extra";
import mockedEnv from "mocked-env";
describe("Add api-connection cli", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  let mockedEnvRestore: () => void;
  before(async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_API_CONNECT_ENABLE: "true",
    });
  });
  after(async () => {
    mockedEnvRestore();
    await cleanUp(appName, projectPath, false, false, false);
  });

  it("Generate Sample codes success - basic auth", async () => {
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Bot);
    await CliHelper.addExistingApi(
      projectPath,
      `--api-connector-auth-type basic --component bot --api-connector-user-name basictest --api-connector-endpoint https://localhost.basictest.com --api-connector-name basictest --interactive false`
    );
    // Assert
    expect(await fs.pathExists(path.join(testFolder, "bot", "basictest.js"))).to.be.true;
    expect(await fs.pathExists(path.join(testFolder, "bot", ".env.teamsfx.local"))).to.be.true;
    // todo check the content.
  });
});
