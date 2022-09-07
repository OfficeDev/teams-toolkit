// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as path from "path";
import sinon from "sinon";
import fs from "fs-extra";
import { checkApiNameExist } from "../../../../src/component/feature/apiconnector/checker";
import { Constants } from "../../../../src/component/feature/apiconnector/constants";
describe("Api Connector question test cases", async () => {
  const sandbox = sinon.createSandbox();
  const testpath = path.join(__dirname, "api-connect-question");
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
  it("checkApiNameExist validate success", async () => {
    const languageType = "javascript";
    const components: string[] = ["bot", "api"];
    const res = await checkApiNameExist("test", testpath, components, languageType);
    chai.assert.isUndefined(res);
  });

  it("checkApiNameExist validate fail", async () => {
    await fs.ensureFile(path.join(botPath, Constants.sampleCodeDir, "test.js"));
    const languageType = "javascript";
    const components: string[] = ["bot", "api"];
    const res = await checkApiNameExist("test", testpath, components, languageType);
    chai.assert.isString(res);
    chai.assert.strictEqual(
      res as string,
      "Please provide a different API name to avoid conflicts with existing file test.js"
    );
  });
});
