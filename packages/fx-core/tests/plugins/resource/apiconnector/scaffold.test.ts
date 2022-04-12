// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as path from "path";
import os from "os";
import sinon from "sinon";
import fs from "fs-extra";
import { expect } from "chai";
import { ResourcePlugins, ConstantString } from "../util";
import { ApiConnectorImpl } from "../../../../src/plugins/resource/apiconnector/plugin";
import { SampleHandler } from "../../../../src/plugins/resource/apiconnector/sampleHandler";
import { Inputs, Platform, SystemError } from "@microsoft/teamsfx-api";
import { MockContext } from "./utils";
import { ErrorMessage } from "../../../../src/plugins/resource/apiconnector/errors";

class Constants {
  public static readonly envFileName = ".env.teamsfx.local";
  public static readonly pkgJsonFile = "package.json";
  public static readonly pkgLockFile = "package-lock.json";
}

describe("Api Connector scaffold sample code", async () => {
  const sandbox = sinon.createSandbox();
  const testpath = path.join(__dirname, "api-connect-scaffold");
  const botPath = path.join(testpath, "bot");
  const apiPath = path.join(testpath, "api");
  const context = MockContext();
  const inputs: Inputs = { platform: Platform.VSCode, projectPath: testpath };
  beforeEach(async () => {
    await fs.ensureDir(testpath);
    await fs.ensureDir(botPath);
    await fs.ensureDir(apiPath);
    await fs.copyFile(
      path.join(__dirname, "sampleFiles", "package.json"),
      path.join(botPath, "package.json")
    );
    await fs.copyFile(
      path.join(__dirname, "sampleFiles", "package.json"),
      path.join(apiPath, "package.json")
    );
  });

  afterEach(async () => {
    await fs.remove(testpath);
    sandbox.restore();
  });
  it("call add existing api connector success", async () => {
    const expectInputs = {
      "component-select": ["api", "bot"],
      "api-connector-name": "test",
      "api-connector-endpoint": "test.endpoint",
      "api-connector-auth-type": "basic",
      "api-connector-user-name": "test account",
    };
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    await apiConnector.scaffold(context, fakeInputs);
    expect(await fs.pathExists(path.join(botPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(botPath, "test.js"))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, "test.js"))).to.be.true;
  });

  it("restore files meets failure on scaffold", async () => {
    sandbox.stub(SampleHandler.prototype, "generateSampleCode").rejects("Create File Failed");
    const expectInputs = {
      "component-select": ["api", "bot"],
      "api-connector-name": "test",
      "api-connector-endpoint": "test.endpoint",
      "api-connector-auth-type": "basic",
      "api-connector-user-name": "test account",
    };
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    await fs.copyFile(
      path.join(__dirname, "sampleFiles", "package.json"),
      path.join(botPath, "package.json")
    );
    try {
      await apiConnector.scaffold(context, fakeInputs);
    } catch (err) {
      chai.assert.strictEqual(err.source, ErrorMessage.generateApiConFilesError.name);
    }
    expect(await fs.pathExists(path.join(botPath, "fake.ts"))).to.be.false;
    const actualFile = await fs.readFile(
      path.join(__dirname, "sampleFiles", "package.json"),
      ConstantString.UTF8Encoding
    );
    const expectedContent = await fs.readFile(
      path.join(botPath, "package.json"),
      ConstantString.UTF8Encoding
    );
    chai.assert.strictEqual(
      actualFile.replace(/\r?\n/g, os.EOL),
      expectedContent.replace(/\r?\n/g, os.EOL)
    );
  });
});
