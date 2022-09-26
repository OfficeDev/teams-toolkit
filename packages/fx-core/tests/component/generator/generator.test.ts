// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import AdmZip from "adm-zip";
import _ from "lodash";
import "mocha";
import fs from "fs-extra";
import path from "path";
import {
  fetchZipUrl,
  genFileDataRenderReplaceFn,
  genFileNameRenderReplaceFn,
  getValidSampleDestination,
  unzip,
} from "../../../src/component/generator/utils";
import { assert } from "chai";
import { compareDirs } from "./utils";
import { templateDownloadBaseUrl } from "../../../src/component/generator/constant";
import { Generator } from "../../../src/component/generator/generator";
import { createContextV3 } from "../../../src/component/utils";
import { setTools } from "../../../src/core/globalVars";
import { MockTools } from "../../core/utils";
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

  it("fetch zip url", async () => {
    const url = await fetchZipUrl("bot.csharp.default", templateDownloadBaseUrl);
    assert.isNotEmpty(url);
  });

  it("get valid sample destination with existing folder", async () => {
    const sampleName = "generator";
    const dstPath = path.resolve(__dirname, "../");
    assert.equal(
      await getValidSampleDestination(sampleName, dstPath),
      path.join(dstPath, "generator_1")
    );
  });
});

describe("Generator happy path", () => {
  const tools = new MockTools();
  setTools(tools);
  const context = createContextV3();
  const tmpDir = path.join(__dirname, "tmp");

  afterEach(async () => {
    if (await fs.pathExists(tmpDir)) {
      await fs.rm(tmpDir, { recursive: true });
    }
  });
  it("external sample", async () => {
    const sampleName = "bot-proactive-messaging-teamsfx";
    await Generator.generateSample(sampleName, tmpDir, context);
    const files = await fs.readdir(path.join(tmpDir, sampleName));
    assert.isTrue(files.length > 0);
    assert.isTrue(files.includes(".fx"));
  });
});
