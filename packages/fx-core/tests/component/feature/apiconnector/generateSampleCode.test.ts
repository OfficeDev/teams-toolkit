// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as path from "path";
import os from "os";
import sinon from "sinon";
import fs from "fs-extra";
import { expect } from "chai";
import { SampleHandler } from "../../../../src/component/feature/apiconnector/sampleHandler";
import { ApiConnectorConfiguration } from "../../../../src/component/feature/apiconnector/config";
import { SampleCodeCases } from "./utils";
import { Constants } from "../../../../src/component/feature/apiconnector/constants";
import { ConstantString } from "../../../../src/common/constants";

describe("Api Connector scaffold sample code", async () => {
  const sandbox = sinon.createSandbox();
  const testpath = path.join(__dirname, "api-connect-generate");
  const botPath = path.join(testpath, "bot");

  beforeEach(async () => {
    await fs.ensureDir(testpath);
    await fs.ensureDir(botPath);
  });

  afterEach(async () => {
    await fs.remove(testpath);
    sandbox.restore();
  });

  it("generate js sample code files", async () => {
    const languageType = "javascript";
    const componet = "bot";
    const sampleHandler: SampleHandler = new SampleHandler(testpath, languageType, componet);

    for (const item of SampleCodeCases) {
      const fakeConfig: ApiConnectorConfiguration = {
        ComponentType: ["bot"],
        APIName: "fake",
        EndPoint: "fake_endpoint",
        AuthConfig: item.AuthConfig,
      };
      await sampleHandler.generateSampleCode(fakeConfig);
      const expectedFile = path.join(botPath, Constants.sampleCodeDir, "fake.js");
      expect(await fs.pathExists(expectedFile)).to.be.true;
      const actualFile = await fs.readFile(expectedFile, ConstantString.UTF8Encoding);
      const expectedContent = await fs.readFile(
        path.join(__dirname, "expectedFiles", "js", item.FileName),
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(
        actualFile.replace(/\r?\n/g, os.EOL),
        expectedContent.replace(/\r?\n/g, os.EOL)
      );
    }
  });

  it("generate ts sample code files", async () => {
    await fs.ensureDir(path.join(botPath, "src"));
    const languageType = "typescript";
    const componet = "bot";
    const sampleHandler: SampleHandler = new SampleHandler(testpath, languageType, componet);
    for (const item of SampleCodeCases) {
      const fakeConfig: ApiConnectorConfiguration = {
        ComponentType: ["bot"],
        APIName: "fake",
        EndPoint: "fake_endpoint",
        AuthConfig: item.AuthConfig,
      };
      await sampleHandler.generateSampleCode(fakeConfig);
      const expectedFile = path.join(botPath, "src", Constants.sampleCodeDir, "fake.ts");
      expect(await fs.pathExists(expectedFile)).to.be.true;
      const actualFile = await fs.readFile(expectedFile, ConstantString.UTF8Encoding);
      const expectedContent = await fs.readFile(
        path.join(__dirname, "expectedFiles", "ts", item.FileName),
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(
        actualFile.replace(/\r?\n/g, os.EOL),
        expectedContent.replace(/\r?\n/g, os.EOL)
      );
    }
  });
});
