// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import _ from "lodash";
import "mocha";
import fs from "fs-extra";
import path from "path";
import {
  fetchTemplateZipUrl,
  getSampleInfoFromName,
  renderTemplateFileData,
  renderTemplateFileName,
} from "../../../src/component/generator/utils";
import { assert } from "chai";
import { Generator } from "../../../src/component/generator/generator";
import { createContextV3 } from "../../../src/component/utils";
import { setTools } from "../../../src/core/globalVars";
import { MockTools } from "../../core/utils";
import AdmZip from "adm-zip";
import sinon from "sinon";
import {
  fetchTemplateUrlWithTagAction,
  fetchTemplateZipFromLocalAction,
  fetchZipFromUrlAction,
  unzipAction,
} from "../../../src/component/generator/generatorAction";
import * as generatorUtils from "../../../src/component/generator/utils";
import mockedEnv from "mocked-env";
import { FeatureFlagName } from "../../../src/common/constants";
import { defaultTimeoutInMs, defaultTryLimits } from "../../../src/component/generator/constant";

describe("Generator utils", () => {
  const tmpDir = path.join(__dirname, "tmp");
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
    if (await fs.pathExists(tmpDir)) {
      await fs.rm(tmpDir, { recursive: true });
    }
  });

  it("fetch zip from url", async () => {
    const url =
      "https://github.com/OfficeDev/TeamsFx/releases/download/templates-0.0.0-alpha/bot.csharp.default.zip";
    await generatorUtils.fetchZipFromUrl(url, defaultTryLimits, defaultTimeoutInMs);
  });

  it("unzip ", async () => {
    const inputDir = path.join(tmpDir, "input");
    const outputDir = path.join(tmpDir, "output");
    await fs.ensureDir(inputDir);
    const fileData = "{%appName%}";
    await fs.writeFile(path.join(inputDir, "test.txt.tpl"), fileData);
    const zip = new AdmZip();
    zip.addLocalFolder(inputDir);
    zip.writeZip(path.join(tmpDir, "test.zip"));
    await generatorUtils.unzip(
      new AdmZip(path.join(tmpDir, "test.zip")),
      outputDir,
      (fileName: string, fileData: Buffer) => renderTemplateFileName(fileName, fileData, {}),
      (fileName: string, fileData: Buffer) =>
        renderTemplateFileData(fileName, fileData, { appName: "test" })
    );
    const content = await fs.readFile(path.join(outputDir, "test.txt"), "utf8");
    assert.equal(content, "test");
  });

  it("get sample info from name", async () => {
    const sampleName = "test";
    try {
      getSampleInfoFromName(sampleName);
    } catch (e) {
      assert.equal(e.message, "invalid sample name: 'test'");
    }
  });
});

describe("Generator error", async () => {
  const tools = new MockTools();
  setTools(tools);
  const ctx = createContextV3();
  const sandbox = sinon.createSandbox();
  const tmpDir = path.join(__dirname, "tmp");

  afterEach(async () => {
    sandbox.restore();
  });

  it("fetch sample zip from url error", async () => {
    sandbox.stub(fetchZipFromUrlAction, "run").throws(new Error("test"));
    const result = await Generator.generateSample(ctx, tmpDir, "bot-sso");
    if (result.isErr()) {
      assert.equal(result.error.innerError.name, "FetchZipFromUrlError");
    }
  });

  it("template fallback error", async () => {
    sandbox.stub(fetchTemplateUrlWithTagAction, "run").throws(new Error("test"));
    sandbox.stub(fetchTemplateZipFromLocalAction, "run").throws(new Error("test"));
    const result = await Generator.generateTemplate(ctx, tmpDir, "bot", "ts");
    if (result.isErr()) {
      assert.equal(result.error.innerError.name, "TemplateZipFallbackError");
    }
  });

  it("unzip error", async () => {
    sandbox.stub(fetchTemplateUrlWithTagAction, "run").resolves();
    sandbox.stub(fetchZipFromUrlAction, "run").resolves();
    sandbox.stub(fetchTemplateZipFromLocalAction, "run").resolves();
    sandbox.stub(unzipAction, "run").throws(new Error("test"));
    const result = await Generator.generateTemplate(ctx, tmpDir, "bot", "ts");
    if (result.isErr()) {
      assert.equal(result.error.innerError.name, "UnzipError");
    }
  });
});

describe("Generator happy path", async () => {
  const tools = new MockTools();
  setTools(tools);
  const context = createContextV3();
  const sandbox = sinon.createSandbox();
  const tmpDir = path.join(__dirname, "tmp");

  afterEach(async () => {
    sandbox.restore();
    if (await fs.pathExists(tmpDir)) {
      await fs.rm(tmpDir, { recursive: true });
    }
  });

  it("external sample", async () => {
    sandbox.stub(generatorUtils, "fetchZipFromUrl").resolves(new AdmZip());
    const sampleName = "bot-proactive-messaging-teamsfx";
    const result = await Generator.generateSample(context, tmpDir, sampleName);
    assert.isTrue(result.isOk());
  });

  it("teamsfx sample", async () => {
    sandbox.stub(generatorUtils, "fetchZipFromUrl").resolves(new AdmZip());
    const sampleName = "bot-sso";
    const result = await Generator.generateSample(context, tmpDir, sampleName);
    assert.isTrue(result.isOk());
  });

  it("template", async () => {
    const templateName = "command-and-response";
    const language = "ts";
    const inputDir = path.join(tmpDir, "input");
    await fs.ensureDir(path.join(inputDir, templateName));
    const fileData = "{%appName%}";
    await fs.writeFile(path.join(inputDir, templateName, "test.txt.tpl"), fileData);
    const zip = new AdmZip();
    zip.addLocalFolder(inputDir);
    zip.writeZip(path.join(tmpDir, "test.zip"));
    sandbox
      .stub(generatorUtils, "fetchZipFromUrl")
      .resolves(new AdmZip(path.join(tmpDir, "test.zip")));
    context.templateVariables = Generator.getDefaultVariables("test");
    const result = await Generator.generateTemplate(context, tmpDir, templateName, language);
    assert.isTrue(result.isOk());
  });

  it("template from source code", async () => {
    const templateName = "test";
    const language = "ts";
    const mockedEnvRestore = mockedEnv({
      [FeatureFlagName.DebugTemplate]: "true",
      NODE_ENV: "development",
    });
    sandbox.stub(generatorUtils, "unzip").resolves();
    sandbox.stub(generatorUtils, "zipFolder").returns(new AdmZip());

    let success = false;
    try {
      await Generator.generateTemplate(context, tmpDir, templateName, language);
      success = true;
    } catch (e) {
      assert.fail(e.toString());
    }
    assert.isTrue(success);
    mockedEnvRestore();
  });
});
