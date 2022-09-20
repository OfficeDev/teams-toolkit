// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import AdmZip from "adm-zip";
import _ from "lodash";
import "mocha";
import fs from "fs-extra";
import path from "path";
import {
  genFileDataRenderReplaceFn,
  genFileNameRenderReplaceFn,
  unzip,
} from "../../../src/component/generator/utils";
import { assert } from "chai";
import { compareDirs } from "./utils";
describe("Generator utils", () => {
  const tmpDir = path.join(__dirname, "tmp");

  afterEach(async () => {
    if (await fs.pathExists(tmpDir)) {
      await fs.rm(tmpDir, { recursive: true });
    }
  });

  it("unzip all", async () => {
    const projectName = "unzipTest";
    const zip = new AdmZip(path.join(__dirname, "zip/unzip_all.zip"));
    const dstPath = path.join(tmpDir, projectName);
    const expectedPath = path.join(__dirname, `expected/${projectName}`);
    const fileDataReplaceFn = genFileDataRenderReplaceFn({
      appName: "testAppName",
      projectId: "testProjectId",
    });
    const fileNameReplaceFn = genFileNameRenderReplaceFn({});
    await unzip(zip, dstPath, undefined, fileNameReplaceFn, fileDataReplaceFn);
    assert.isTrue(compareDirs(dstPath, expectedPath));
  });

  it("unzip partial", async () => {
    const projectName = "unzipTest";
    const zip = new AdmZip(path.join(__dirname, "zip/unzip_partial.zip"));
    const dstPath = path.join(tmpDir, projectName);
    const relativePath = "template";
    const expectedPath = path.join(__dirname, `expected/${projectName}`);
    const fileDataReplaceFn = genFileDataRenderReplaceFn({
      appName: "testAppName",
      projectId: "testProjectId",
    });
    const fileNameReplaceFn = genFileNameRenderReplaceFn({});
    await unzip(zip, dstPath, relativePath, fileNameReplaceFn, fileDataReplaceFn);
    assert.isTrue(compareDirs(dstPath, expectedPath));
  });
});
