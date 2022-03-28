// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as path from "path";
import fs from "fs-extra";
import { expect } from "chai";
import { SampleHandler } from "../../../../src/plugins/resource/apiconnector/sampleHandler";
import { ApiConnectorConfiguration } from "../../../../src/plugins/resource/apiconnector/utils";
import { ConstantString } from "../util";

describe("Api Connector scaffold sample code", async () => {
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
  });

  it("generate js sample code file", async () => {
    const languageType = "javascript";
    const componet = "bot";
    const sampleHandler: SampleHandler = new SampleHandler(testpath, languageType, componet);
    await sampleHandler.generateSampleCode();
    expect(await fs.pathExists(path.join(botPath, "api-connector.js"))).to.be.true;
    const actualFile = await fs.readFile(
      path.join(botPath, "api-connector.js"),
      ConstantString.UTF8Encoding
    );
    const expectedContent = await fs.readFile(
      path.join(__dirname, "expectedFiles", "sample.js"),
      ConstantString.UTF8Encoding
    );
    chai.assert.strictEqual(actualFile, expectedContent);
  });

  it("generate ts sample code file", async () => {
    const languageType = "typescript";
    const componet = "bot";
    const sampleHandler: SampleHandler = new SampleHandler(testpath, languageType, componet);
    await sampleHandler.generateSampleCode();
    expect(await fs.pathExists(path.join(botPath, "api-connector.ts"))).to.be.true;
    const actualFile = await fs.readFile(
      path.join(botPath, "api-connector.ts"),
      ConstantString.UTF8Encoding
    );
    const expectedContent = await fs.readFile(
      path.join(__dirname, "expectedFiles", "sample.ts"),
      ConstantString.UTF8Encoding
    );
    chai.assert.strictEqual(actualFile, expectedContent);
  });
});
