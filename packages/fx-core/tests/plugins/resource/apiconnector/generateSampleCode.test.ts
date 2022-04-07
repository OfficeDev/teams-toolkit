// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as path from "path";
import os from "os";
import sinon from "sinon";
import fs from "fs-extra";
import { expect } from "chai";
import { ConstantString } from "../util";
import { SampleHandler } from "../../../../src/plugins/resource/apiconnector/sampleHandler";
import {
  AADAuthConfig,
  ApiConnectorConfiguration,
  BasicAuthConfig,
} from "../../../../src/plugins/resource/apiconnector/config";
import { AuthType } from "../../../../src/plugins/resource/apiconnector/constants";

describe("Api Connector scaffold sample code", async () => {
  const sandbox = sinon.createSandbox();
  const testpath = path.join(__dirname, "api-connect-generate");
  const botPath = path.join(testpath, "bot");
  const apiPath = path.join(testpath, "api");

  beforeEach(async () => {
    await fs.ensureDir(testpath);
    await fs.ensureDir(botPath);
    await fs.ensureDir(apiPath);
  });

  afterEach(async () => {
    await fs.remove(testpath);
    sandbox.restore();
  });

  it("generate js basic sample code file", async () => {
    const languageType = "javascript";
    const componet = "bot";
    const sampleHandler: SampleHandler = new SampleHandler(testpath, languageType, componet);
    const fakeConfig: ApiConnectorConfiguration = {
      ComponentPath: ["bot"],
      APIName: "fake",
      EndPoint: "fake_endpoint",
      AuthConfig: {
        AuthType: AuthType.BASIC,
        UserName: "fake_api_user_name",
      } as BasicAuthConfig,
    };
    await sampleHandler.generateSampleCode(fakeConfig);
    expect(await fs.pathExists(path.join(botPath, "fake.js"))).to.be.true;
    const actualFile = await fs.readFile(
      path.join(botPath, "fake.js"),
      ConstantString.UTF8Encoding
    );
    const expectedContent = await fs.readFile(
      path.join(__dirname, "expectedFiles", "js", "basic.js"),
      ConstantString.UTF8Encoding
    );
    chai.assert.strictEqual(
      actualFile.replace(/\r?\n/g, os.EOL),
      expectedContent.replace(/\r?\n/g, os.EOL)
    );
  });

  it("generate ts basic sample code file", async () => {
    const languageType = "typescript";
    const componet = "bot";
    const sampleHandler: SampleHandler = new SampleHandler(testpath, languageType, componet);
    const fakeConfig: ApiConnectorConfiguration = {
      ComponentPath: ["bot"],
      APIName: "fake",
      EndPoint: "fake_endpoint",
      AuthConfig: {
        AuthType: AuthType.BASIC,
        UserName: "fake_api_user_name",
      } as BasicAuthConfig,
    };
    await sampleHandler.generateSampleCode(fakeConfig);
    expect(await fs.pathExists(path.join(botPath, "fake.ts"))).to.be.true;
    const actualFile = await fs.readFile(
      path.join(botPath, "fake.ts"),
      ConstantString.UTF8Encoding
    );
    const expectedContent = await fs.readFile(
      path.join(__dirname, "expectedFiles", "ts", "basic.ts"),
      ConstantString.UTF8Encoding
    );
    chai.assert.strictEqual(
      actualFile.replace(/\r?\n/g, os.EOL),
      expectedContent.replace(/\r?\n/g, os.EOL)
    );
  });

  it("generate js aad with reusing sample code file", async () => {
    const languageType = "javascript";
    const componet = "bot";
    const sampleHandler: SampleHandler = new SampleHandler(testpath, languageType, componet);
    const fakeConfig: ApiConnectorConfiguration = {
      ComponentPath: ["bot"],
      APIName: "fake",
      EndPoint: "fake_endpoint",
      AuthConfig: {
        AuthType: AuthType.AAD,
        ReuseTeamsApp: true,
      } as AADAuthConfig,
    };
    await sampleHandler.generateSampleCode(fakeConfig);
    expect(await fs.pathExists(path.join(botPath, "fake.js"))).to.be.true;
    const actualFile = await fs.readFile(
      path.join(botPath, "fake.js"),
      ConstantString.UTF8Encoding
    );
    const expectedContent = await fs.readFile(
      path.join(__dirname, "expectedFiles", "js", "aad.js"),
      ConstantString.UTF8Encoding
    );
    chai.assert.strictEqual(
      actualFile.replace(/\r?\n/g, os.EOL),
      expectedContent.replace(/\r?\n/g, os.EOL)
    );
  });

  it("generate ts aad with reusing sample code file", async () => {
    const languageType = "typescript";
    const componet = "bot";
    const sampleHandler: SampleHandler = new SampleHandler(testpath, languageType, componet);
    const fakeConfig: ApiConnectorConfiguration = {
      ComponentPath: ["bot"],
      APIName: "fake",
      EndPoint: "fake_endpoint",
      AuthConfig: {
        AuthType: AuthType.AAD,
        ReuseTeamsApp: true,
      } as AADAuthConfig,
    };
    await sampleHandler.generateSampleCode(fakeConfig);
    expect(await fs.pathExists(path.join(botPath, "fake.ts"))).to.be.true;
    const actualFile = await fs.readFile(
      path.join(botPath, "fake.ts"),
      ConstantString.UTF8Encoding
    );
    const expectedContent = await fs.readFile(
      path.join(__dirname, "expectedFiles", "ts", "aad.ts"),
      ConstantString.UTF8Encoding
    );
    chai.assert.strictEqual(
      actualFile.replace(/\r?\n/g, os.EOL),
      expectedContent.replace(/\r?\n/g, os.EOL)
    );
  });
});
