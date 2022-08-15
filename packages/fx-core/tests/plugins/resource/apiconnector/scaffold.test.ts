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
import { Inputs, Platform, SystemError, UserError } from "@microsoft/teamsfx-api";
import { MockContext } from "./utils";
import { Constants as Constants1 } from "../../../../src/plugins/resource/apiconnector/constants";

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
  it("scaffold api without api active resource", async () => {
    const expectInputs = {
      component: ["api"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const context = MockContext();
    context.projectSetting.solutionSettings.activeResourcePlugins = ["fx-resource-bot"];
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    try {
      await apiConnector.scaffold(context, fakeInputs);
    } catch (err) {
      expect(err instanceof UserError).to.be.true;
      chai.assert.strictEqual(err.source, "api-connector");
      chai.assert.strictEqual(err.displayMessage, "Component api not exist, please add first");
    }
  });
  it("call add existing api connector success", async () => {
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    const result = await apiConnector.scaffold(context, fakeInputs);
    expect(await fs.pathExists(path.join(botPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(botPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    const expectResult = ["api", "bot"].map((item) => {
      return path.join(testpath, item, "test.js");
    });
    expect(result).to.deep.equal({ generatedFiles: expectResult });
  });

  it("restore files meets failure on scaffold", async () => {
    sandbox.stub(SampleHandler.prototype, "generateSampleCode").throws(new Error("fake error"));
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    await fs.copyFile(
      path.join(__dirname, "sampleFiles", "package.json"),
      path.join(botPath, "package.json")
    );
    try {
      await apiConnector.scaffold(context, fakeInputs);
    } catch (err) {
      expect(err instanceof SystemError).to.be.true;
      chai.assert.strictEqual(err.source, "api-connector");
      chai.assert.strictEqual(
        err.displayMessage,
        "Failed to scaffold connect API files, Reason: fake error"
      );
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
