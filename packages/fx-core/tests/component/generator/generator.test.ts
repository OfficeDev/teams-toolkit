// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import _ from "lodash";
import "mocha";
import fs from "fs-extra";
import path from "path";
import axios, { AxiosError, AxiosResponse, AxiosHeaders } from "axios";
import {
  downloadDirectory,
  getSampleInfoFromName,
  runWithLimitedConcurrency,
  renderTemplateFileData,
  renderTemplateFileName,
  simplifyAxiosError,
  isApiLimitError,
} from "../../../src/component/generator/utils";
import { assert } from "chai";
import {
  Generator,
  templateDefaultOnActionError,
} from "../../../src/component/generator/generator";
import { createContextV3 } from "../../../src/component/utils";
import { setTools } from "../../../src/core/globalVars";
import { MockTools } from "../../core/utils";
import AdmZip from "adm-zip";
import { createSandbox } from "sinon";
import {
  GeneratorContext,
  fetchTemplateUrlWithTagAction,
  fetchTemplateFromLocalAction,
  fetchZipFromUrlAction,
  unzipAction,
  fetchSampleInfoAction,
} from "../../../src/component/generator/generatorAction";
import * as generatorUtils from "../../../src/component/generator/utils";
import mockedEnv from "mocked-env";
import { FeatureFlagName } from "../../../src/common/constants";
import { sampleProvider, SampleConfig } from "../../../src/common/samples";
import templateConfig from "../../../src/common/templates-config.json";
import { placeholderDelimiters } from "../../../src/component/generator/constant";
import sampleConfigV3 from "../../common/samples-config-v3.json";
import Mustache from "mustache";
import * as folderUtils from "../../../../fx-core/src/folder";
import {
  DownloadSampleNetworkError,
  FetchSampleInfoError,
} from "../../../src/component/generator/error";

const mockedSampleInfo: SampleConfig = {
  id: "test-id",
  onboardDate: new Date(),
  title: "test-title",
  shortDescription: "test-sd",
  fullDescription: "test-fd",
  types: [],
  tags: [],
  time: "",
  configuration: "test-configuration",
  suggested: false,
  thumbnailUrl: "",
  gifUrl: "",
  downloadUrlInfo: {
    owner: "OfficeDev",
    repository: "TeamsFx-Samples",
    ref: "dev",
    dir: "test",
  },
};

// The sample prefix is present in the downloadurl of the external sample
const mockedExternalSampleConfig = {
  samples: [
    {
      id: "test",
      onboardDate: new Date(),
      title: "test-title",
      shortDescription: "test-sd",
      fullDescription: "test-fd",
      types: [],
      tags: [],
      time: "",
      configuration: "test-configuration",
      suggested: false,
      gifUrl: "",
      downloadUrlInfo: {
        owner: "Org",
        repository: "Repo",
        ref: "main",
        dir: "sample/test",
      },
    },
  ],
};

describe("Generator utils", () => {
  const tmpDir = path.join(__dirname, "tmp");
  const sandbox = createSandbox();
  let mockedEnvRestore = mockedEnv({});

  afterEach(async () => {
    sandbox.restore();
    if (await fs.pathExists(tmpDir)) {
      await fs.rm(tmpDir, { recursive: true });
    }
    mockedEnvRestore();
  });

  it("return rc if set env rc", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_TEMPLATE_PRERELEASE: "rc",
    });
    const tagList = "1.0.0\n 2.0.0\n 2.1.0\n 3.0.0\n 0.0.0-rc";
    sandbox.replace(templateConfig, "useLocalTemplate", false);
    sandbox.stub(axios, "get").resolves({ data: tagList, status: 200 } as AxiosResponse);
    const url = await generatorUtils.fetchTemplateZipUrl("templateName");
    assert.isTrue(url.includes("0.0.0-rc"));
  });

  it("set useLocalTemplate flag to true", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_TEMPLATE_PRERELEASE: "",
    });
    sandbox.replace(templateConfig, "useLocalTemplate", true);
    const tagList = "1.0.0\n 2.0.0\n 2.1.0\n 3.0.0";
    sandbox.stub(axios, "get").resolves({ data: tagList, status: 200 } as AxiosResponse);
    try {
      await generatorUtils.fetchTemplateZipUrl("templateName");
    } catch (e) {
      assert.exists(e);
      return;
    }
    assert.fail("Should not reach here.");
  });

  it("return correct version", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_TEMPLATE_PRERELEASE: "",
    });
    const tagList = "1.0.0\n 2.0.0\n 2.1.0\n 3.0.0";
    const tag = "2.1.0";
    sandbox.replace(templateConfig, "useLocalTemplate", false);
    sandbox.stub(axios, "get").resolves({ data: tagList, status: 200 } as AxiosResponse);
    sandbox.stub(templateConfig, "version").value("^2.0.0");
    sandbox.replace(templateConfig, "tagPrefix", "templates@");
    const url = await generatorUtils.fetchTemplateZipUrl("templateName");
    assert.isTrue(url.includes(tag));
  });

  it("return error if version pattern cannot match tag list", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_TEMPLATE_PRERELEASE: "",
    });
    const tagList = "1.0.0\n 2.0.0\n 2.1.0\n 3.0.0";
    sandbox.stub(axios, "get").resolves({ data: tagList, status: 200 } as AxiosResponse);
    sandbox.stub(templateConfig, "version").value("^4.0.0");
    sandbox.replace(templateConfig, "tagPrefix", "templates@");
    try {
      await generatorUtils.fetchTemplateZipUrl("templateName");
    } catch (e) {
      assert.exists(e);
      return;
    }
    assert.fail("Should not reach here.");
  });

  it("sendRequestWithRetry throw error if requestFn returns error status code", async () => {
    const requestFn = async () => {
      return { status: 400 } as AxiosResponse;
    };
    try {
      await generatorUtils.sendRequestWithRetry(requestFn, 1);
    } catch (e) {
      assert.exists(e);
      return;
    }
    assert.fail("Should not reach here.");
  });

  it("sendRequestWithRetry throw error if requestFn throw error", async () => {
    const requestFn = async () => {
      throw new Error("test");
    };
    try {
      await generatorUtils.sendRequestWithRetry(requestFn, 1);
    } catch (e) {
      assert.exists(e);
      return;
    }
    assert.fail("Should not reach here.");
  });

  it("sendRequestWithTimeout throw error if requestFn throw error", async () => {
    const requestFn = async () => {
      throw new Error("test");
    };
    try {
      await generatorUtils.sendRequestWithTimeout(requestFn, 1000, 1);
    } catch (e) {
      assert.exists(e);
      return;
    }
    assert.fail("Should not reach here.");
  });

  it("sendRequestWithTimeout throw request timeout if requestFn throw error", async () => {
    const requestFn = async () => {
      throw new Error("test");
    };
    sandbox.stub(axios, "isCancel").returns(true);
    try {
      await generatorUtils.sendRequestWithTimeout(requestFn, 1000, 2);
    } catch (e) {
      assert.exists(e);
      return;
    }
    assert.fail("Should not reach here.");
  });

  it("fetch zip from url", async () => {
    sandbox.stub(axios, "get").resolves({ status: 200, data: new AdmZip().toBuffer() });
    const url = "ut";
    const zip = await generatorUtils.fetchZipFromUrl(url);
    assert.equal(zip.getEntries().length, 0);
  });

  it("unzip", async () => {
    const inputDir = path.join(tmpDir, "input");
    const outputDir = path.join(tmpDir, "output");
    await fs.ensureDir(inputDir);
    const fileData = "{{appName}}";
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

  it("unzip with no render function", async () => {
    const inputDir = path.join(tmpDir, "input");
    const outputDir = path.join(tmpDir, "output");
    await fs.ensureDir(inputDir);
    const fileData = "{{appName}}";
    await fs.writeFile(path.join(inputDir, "test.txt"), fileData);
    const zip = new AdmZip();
    zip.addLocalFolder(inputDir);
    zip.writeZip(path.join(tmpDir, "test.zip"));
    await generatorUtils.unzip(new AdmZip(path.join(tmpDir, "test.zip")), outputDir);
    const content = await fs.readFile(path.join(outputDir, "test.txt"), "utf8");
    assert.equal(content, fileData);
  });

  it("unzip with relative path", async () => {
    const inputDir = path.join(tmpDir, "input");
    const outputDir = path.join(tmpDir, "output");
    await fs.ensureDir(inputDir);
    const fileData = "{{appName}}";
    await fs.writeFile(path.join(inputDir, "test.txt.tpl"), fileData);
    const zip = new AdmZip();
    zip.addLocalFolder(inputDir);
    zip.writeZip(path.join(tmpDir, "test.zip"));
    await generatorUtils.unzip(
      new AdmZip(path.join(tmpDir, "test.zip")),
      outputDir,
      (fileName: string, fileData: Buffer) => renderTemplateFileName(fileName, fileData, {}),
      (fileName: string, fileData: Buffer) =>
        renderTemplateFileData(fileName, fileData, { appName: "test" }),
      (fileName: string) => fileName.startsWith("test1")
    );
    assert.isFalse(await fs.pathExists(path.join(outputDir, "test.txt")));
  });

  it("get sample info from name", async () => {
    const sampleName = "test";
    try {
      getSampleInfoFromName(sampleName);
    } catch (e) {
      assert.equal(e.message, "Invalid inputs: sample 'test' not found");
    }
  });

  it("not render if file doensn't end with .tpl", async () => {
    const res = renderTemplateFileData("fileName", Buffer.from("appName", "utf-8"), {
      appName: "test",
    });
    assert.equal(res.toString(), "appName");
  });

  it("zip folder", async () => {
    const inputDir = path.join(tmpDir, "input");
    await fs.ensureDir(inputDir);
    const fileData = "test";
    await fs.writeFile(path.join(inputDir, "test.txt"), fileData);
    const zip = generatorUtils.zipFolder(inputDir);
    zip.getEntry("test.txt")!.getData().toString();
    zip.getEntries().forEach((entry) => {
      assert.equal(entry.getData().toString(), "test");
      assert.equal(zip.getEntries().length, 1);
    });
  });

  it("download directory get file info error", async () => {
    const axiosStub = sandbox.stub(axios, "get");
    const error = new Error("Network error");
    (error as any).isAxiosError = true;
    (error as any).response = {
      status: 403,
      headers: {
        "x-ratelimit-remaining": "0",
      },
    };
    axiosStub.onFirstCall().rejects(error);
    try {
      await downloadDirectory(
        {
          owner: "OfficeDev",
          repository: "TeamsFx-Samples",
          ref: "dev",
          dir: "test",
        },
        tmpDir
      );
    } catch (e) {
      assert.exists(e);
      return;
    }
    assert.fail("Should not reach here.");
  });

  it("download directory happy path", async () => {
    const axiosStub = sandbox.stub(axios, "get");
    const sampleName = "test";
    const mockFileName = "test.txt";
    const mockFileData = "test data";
    const fileInfo = [{ type: "file", path: `${sampleName}/${mockFileName}` }];
    axiosStub.onFirstCall().resolves({ status: 200, data: { tree: fileInfo } });
    axiosStub.onSecondCall().resolves({ status: 200, data: mockFileData });
    await fs.ensureDir(tmpDir);
    await downloadDirectory(
      {
        owner: "OfficeDev",
        repository: "TeamsFx-Samples",
        ref: "dev",
        dir: "test",
      },
      tmpDir
    );
    const data = await fs.readFile(path.join(tmpDir, mockFileName), "utf8");
    assert.equal(data, mockFileData);
  });

  it("limit concurrency", async () => {
    const data = [1, 10, 2, 3];
    let res: number[] = [];
    const callback = async (num: number) => {
      await new Promise((resolve) => setTimeout(resolve, num * 10));
      res.push(num);
    };
    await runWithLimitedConcurrency(data, callback, 2);
    assert.deepEqual(res, [1, 2, 3, 10]);
    res = [];
    await runWithLimitedConcurrency(data, callback, 1);
    assert.deepEqual(res, [1, 10, 2, 3]);
  });

  it("convert sample info to url", async () => {
    const sampleInfo: generatorUtils.SampleUrlInfo = {
      owner: "OfficeDev",
      repository: "TeamsFx-Samples",
      ref: "dev",
      dir: "test",
    };
    const url = generatorUtils.convertToUrl(sampleInfo);
    assert.equal(url, "https://github.com/OfficeDev/TeamsFx-Samples/tree/dev/test");
  });

  it("should simplify an AxiosError", () => {
    const mockError: AxiosError = {
      message: "API rate limit exceeded",
      name: "AxiosError",
      code: "403",
      stack: "Error stack",
      response: {
        config: {
          headers: new AxiosHeaders(),
        },
        status: 403,
        statusText: "Forbidden",
        headers: {
          "x-ratelimit-remaining": "0",
        },
        data: "Error data",
      },
      isAxiosError: true,
      toJSON: () => ({}),
    };
    const simplifiedError = simplifyAxiosError(mockError);
    const expectedError = {
      message: "API rate limit exceeded",
      name: "AxiosError",
      code: "403",
      config: undefined,
      stack: "Error stack",
      status: 403,
      statusText: "Forbidden",
      headers: {
        "x-ratelimit-remaining": "0",
      },
      data: "Error data",
    };

    assert.deepEqual(simplifiedError, expectedError);
  });

  it("should return true for an API limit error", () => {
    const mockError: AxiosError = {
      message: "API rate limit exceeded",
      name: "AxiosError",
      code: "403",
      stack: "Error stack",
      response: {
        config: {
          headers: new AxiosHeaders(),
        },
        status: 403,
        statusText: "Forbidden",
        headers: {
          "x-ratelimit-remaining": "0",
        },
        data: "Error data",
      },
      isAxiosError: true,
      toJSON: () => ({}),
    };

    assert.isTrue(isApiLimitError(mockError));
  });

  it("should return false for a non-API limit error", () => {
    const mockError: AxiosError = {
      message: "Not Found",
      name: "AxiosError",
      code: "404",
      stack: "Error stack",
      isAxiosError: true,
      toJSON: () => ({}),
    };
    assert.isFalse(isApiLimitError(mockError));
  });
});

describe("Generator error", async () => {
  const tools = new MockTools();
  setTools(tools);
  const ctx = createContextV3();
  const sandbox = createSandbox();
  const tmpDir = path.join(__dirname, "tmp");

  afterEach(async () => {
    if (await fs.pathExists(tmpDir)) {
      await fs.rm(tmpDir, { recursive: true });
    }
    sandbox.restore();
  });

  it("no zip url", async () => {
    sandbox.stub(generatorUtils, "fetchZipFromUrl").rejects();
    const generatorContext: GeneratorContext = {
      name: "test",
      destination: "test",
      logProvider: tools.logProvider,
      filterFn: (filename) => filename.startsWith("/"),
      onActionError: templateDefaultOnActionError,
    };
    try {
      try {
        await fetchZipFromUrlAction.run(generatorContext);
      } catch (error) {
        if (generatorContext.onActionError) {
          await generatorContext.onActionError(fetchZipFromUrlAction, generatorContext, error);
        } else {
          throw error;
        }
      }
    } catch (error) {
      assert.notExists(error);
      assert.fail("Should not reach here.");
    }
    assert.isTrue(generatorContext.cancelDownloading);
  });

  it("template fallback error", async () => {
    sandbox.stub(fetchTemplateUrlWithTagAction, "run").throws(new Error("test"));
    sandbox.stub(fetchTemplateFromLocalAction, "run").throws(new Error("test"));
    const result = await Generator.generateTemplate(ctx, tmpDir, "bot", "ts");
    if (result.isErr()) {
      assert.equal(result.error.innerError.name, "TemplateZipFallbackError");
    } else {
      assert.fail("template fallback error should be thrown.");
    }
  });

  it("unzip error", async () => {
    sandbox.stub(fetchTemplateUrlWithTagAction, "run").resolves();
    sandbox.stub(fetchZipFromUrlAction, "run").resolves();
    sandbox.stub(fetchTemplateFromLocalAction, "run").resolves();
    sandbox.stub(unzipAction, "run").throws(new Error("test"));
    const result = await Generator.generateTemplate(ctx, tmpDir, "bot", "ts");
    if (result.isErr()) {
      assert.equal(result.error.innerError.name, "UnzipError");
    } else {
      assert.fail("upzip error should be thrown.");
    }
  });

  it("fetch sample info fail", async () => {
    sandbox.stub(fetchSampleInfoAction, "run").throws(new Error("test"));
    const result = await Generator.generateSample(ctx, tmpDir, "test");
    if (result.isErr()) {
      assert.equal(result.error.name, "FetchSampleInfoError");
    } else {
      assert.fail("fetch sample info error should be thrown.");
    }
  });

  it("sample not found error", async () => {
    sandbox.stub(generatorUtils, "getSampleInfoFromName").resolves(mockedSampleInfo);
    sandbox.stub(generatorUtils, "downloadDirectory").resolves([] as string[]);
    sandbox
      .stub(generatorUtils, "sendRequestWithTimeout")
      .resolves({ data: sampleConfigV3 } as AxiosResponse);

    const result = await Generator.generateSample(ctx, tmpDir, "test");
    if (result.isErr()) {
      assert.equal(result.error.name, "SampleNotFoundError");
    } else {
      assert.fail("Sample not found error should be thrown.");
    }
  });
  it("create download sample network error with correct inner error", async () => {
    const url = "http://example.com";
    const mockError: AxiosError = {
      message: "Test error",
      name: "AxiosError",
      config: {
        headers: new AxiosHeaders(),
      },
      code: "500",
      stack: "Error stack",
      response: {
        config: {
          headers: new AxiosHeaders(),
        },
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        data: "Error data",
      },
      isAxiosError: true,
      toJSON: () => ({}),
    };
    const error = new DownloadSampleNetworkError(url, mockError);
    assert.deepEqual(error.innerError, simplifyAxiosError(mockError));
  });
});

describe("render template", () => {
  it("escape undefined or variable", () => {
    [{ variable: "test" }, { variable: "test", app: null }].forEach((variables) => {
      // arrange
      const filename = "test.tpl";
      const fileData = Buffer.from("{{variable}}{{app}}");
      const expectedResult = "test{{app}}";

      // execute
      const result = renderTemplateFileData(filename, fileData, variables as any);

      assert.equal(result, expectedResult);
    });
  });

  it("do not escape empty string variable", () => {
    // arrange
    const filename = "test.tpl";
    const fileData = Buffer.from("{{variable}}{{app}}");
    const variables = { variable: "test", app: "" };

    // execute
    const result = renderTemplateFileData(filename, fileData, variables);
    const expectedResult = Mustache.render(
      fileData.toString(),
      variables,
      {},
      placeholderDelimiters
    );

    assert.equal(result, expectedResult);
  });

  it("skip non template file", () => {
    // arrange
    const filename = "test.txt";
    const fileData = Buffer.from("{{variable}}{{app}}");
    const variables = { variable: "test", app: "" };
    const expectedResult = fileData;
    // execute
    const result = renderTemplateFileData(filename, fileData, variables);

    assert.deepEqual(result, expectedResult);
  });

  it("no variables", () => {
    // arrange
    const filename = "test.tpl";
    const fileData = Buffer.from("{{variable}}{{app}}");
    const expectedResult = fileData.toString();
    // execute
    const result = renderTemplateFileData(filename, fileData);

    assert.deepEqual(result, expectedResult);
  });
});

describe("Generator happy path", async () => {
  const tools = new MockTools();
  setTools(tools);
  const context = createContextV3();
  const sandbox = createSandbox();
  const tmpDir = path.join(__dirname, "tmp");

  async function buildFakeTemplateZip(templateName: string, mockFileName: string) {
    const mockFileData = "test data";
    const fallbackDir = path.join(tmpDir, "fallback");
    await fs.ensureDir(fallbackDir);
    const templateZip = new AdmZip();
    templateZip.addFile(path.join(templateName, mockFileName), Buffer.from(mockFileData));
    templateZip.writeZip(path.join(fallbackDir, "ts.zip"));
  }

  afterEach(async () => {
    sandbox.restore();
    if (await fs.pathExists(tmpDir)) {
      await fs.rm(tmpDir, { recursive: true });
    }
  });

  it("external sample", async () => {
    const axiosStub = sandbox.stub(axios, "get");
    sandbox
      .stub(sampleProvider, "SampleCollection")
      .value(Promise.resolve(mockedExternalSampleConfig));
    const sampleName = "test";
    const mockFileName = "test.txt";
    const mockFileData = "test data";
    const foobarName = "foobar";
    const foobarFileName = "foobar.txt";
    const fileInfo = [
      { type: "file", path: `sample/${sampleName}/${mockFileName}` },
      { type: "file", path: `sample/${foobarName}/${foobarFileName}` },
    ];
    axiosStub.onFirstCall().resolves({ status: 200, data: { tree: fileInfo } });
    axiosStub.onSecondCall().resolves({ status: 200, data: mockFileData });
    const result = await Generator.generateSample(context, tmpDir, sampleName);
    assert.isTrue(result.isOk());
    if (!fs.existsSync(path.join(tmpDir, mockFileName))) {
      assert.fail("file creation failure");
    }
    if (fs.existsSync(path.join(tmpDir, foobarFileName))) {
      assert.fail("file should not be created");
    }
  });

  it("template", async () => {
    const templateName = "command-and-response";
    const language = "ts";
    const inputDir = path.join(tmpDir, "input");
    await fs.ensureDir(path.join(inputDir, templateName));
    const fileData = "{{appName}}";
    await fs.writeFile(path.join(inputDir, templateName, "test.txt.tpl"), fileData);
    const zip = new AdmZip();
    zip.addLocalFolder(inputDir);
    zip.writeZip(path.join(tmpDir, "test.zip"));
    sandbox.stub(generatorUtils, "fetchTemplateZipUrl").resolves("test.zip");
    sandbox
      .stub(generatorUtils, "fetchZipFromUrl")
      .resolves(new AdmZip(path.join(tmpDir, "test.zip")));
    context.templateVariables = Generator.getDefaultVariables("test");
    const result = await Generator.generateTemplate(context, tmpDir, templateName, language);
    assert.isTrue(result.isOk());
  });

  it("template variables when test tool enabled", async () => {
    sandbox.stub(process, "env").value({ TEAMSFX_TEST_TOOL: "true" });
    const vars = Generator.getDefaultVariables("test");
    assert.equal(vars.enableTestToolByDefault, "true");
  });

  it("template variables when test tool disabled", async () => {
    sandbox.stub(process, "env").value({ TEAMSFX_TEST_TOOL: "false" });
    const vars = Generator.getDefaultVariables("test");
    assert.equal(vars.enableTestToolByDefault, "");
  });

  it("template variables when contains auth", async () => {
    sandbox.stub(process, "env").value({ TEAMSFX_TEST_TOOL: "false" });
    const vars = Generator.getDefaultVariables("Test", "Test", "net6", {
      authName: "authName",
      openapiSpecPath: "path/to/spec.yaml",
      registrationIdEnvName: "AUTHNAME_REGISTRATION_ID",
    });
    assert.equal(vars.enableTestToolByDefault, "");
    assert.equal(vars.appName, "Test");
    assert.equal(vars.ApiSpecAuthName, "authName");
    assert.equal(vars.ApiSpecPath, "path/to/spec.yaml");
    assert.equal(vars.ApiSpecAuthRegistrationIdEnvName, "AUTHNAME_REGISTRATION_ID");
    assert.equal(vars.SafeProjectName, "Test");
    assert.equal(vars.SafeProjectNameLowerCase, "test");
  });

  it("template variables when contains auth with special characters", async () => {
    sandbox.stub(process, "env").value({ TEAMSFX_TEST_TOOL: "false" });
    const vars = Generator.getDefaultVariables("Test", "Test", "net6", {
      authName: "authName",
      openapiSpecPath: "path/to/spec.yaml",
      registrationIdEnvName: "AUTH-NAME_REGISTRATION*ID",
    });
    assert.equal(vars.enableTestToolByDefault, "");
    assert.equal(vars.appName, "Test");
    assert.equal(vars.ApiSpecAuthName, "authName");
    assert.equal(vars.ApiSpecPath, "path/to/spec.yaml");
    assert.equal(vars.ApiSpecAuthRegistrationIdEnvName, "AUTH_NAME_REGISTRATION_ID");
    assert.equal(vars.SafeProjectName, "Test");
    assert.equal(vars.SafeProjectNameLowerCase, "test");
  });

  it("template variables when contains auth with name not start with [A-Z]", async () => {
    sandbox.stub(process, "env").value({ TEAMSFX_TEST_TOOL: "false" });
    const vars = Generator.getDefaultVariables("Test", "Test", undefined, {
      authName: "authName",
      openapiSpecPath: "path/to/spec.yaml",
      registrationIdEnvName: "*AUTH-NAME_REGISTRATION*ID",
    });
    assert.equal(vars.enableTestToolByDefault, "");
    assert.equal(vars.appName, "Test");
    assert.equal(vars.ApiSpecAuthName, "authName");
    assert.equal(vars.ApiSpecPath, "path/to/spec.yaml");
    assert.equal(vars.ApiSpecAuthRegistrationIdEnvName, "PREFIX__AUTH_NAME_REGISTRATION_ID");
    assert.equal(vars.SafeProjectName, "Test");
    assert.equal(vars.SafeProjectNameLowerCase, "test");
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

  it("template from fallback", async () => {
    const templateName = "test";
    const mockFileName = "test.txt";
    const language = "ts";
    const foobarTemplateZip = new AdmZip();
    await buildFakeTemplateZip(templateName, mockFileName);

    sandbox.stub(generatorUtils, "fetchZipFromUrl").resolves(foobarTemplateZip);
    sandbox.stub(folderUtils, "getTemplatesFolder").returns(tmpDir);
    const spyCall = sandbox.spy(fetchTemplateFromLocalAction, "run");

    const result = await Generator.generateTemplate(context, tmpDir, templateName, language);
    assert.isTrue(spyCall.calledOnce);
    if (!fs.existsSync(path.join(tmpDir, mockFileName))) {
      assert.fail("template creation failure");
    }
    assert.isTrue(result.isOk());
  });

  it("use local template", async () => {
    sandbox.replace(templateConfig, "useLocalTemplate", true);
    const templateName = "test";
    const mockFileName = "test.txt";
    const language = "ts";
    await buildFakeTemplateZip(templateName, mockFileName);

    sandbox.stub(folderUtils, "getTemplatesFolder").returns(tmpDir);

    const result = await Generator.generateTemplate(context, tmpDir, templateName, language);
    if (!fs.existsSync(path.join(tmpDir, mockFileName))) {
      assert.fail("local template creation failure");
    }
    assert.isTrue(result.isOk());
  });
});

describe("Generate sample using download directory", () => {
  const tmpDir = path.join(__dirname, "tmp");
  const sandbox = createSandbox();
  let mockedEnvRestore = mockedEnv({});
  const tools = new MockTools();
  setTools(tools);
  const ctx = createContextV3();
  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({
      DOWNLOAD_DIRECTORY: "true",
    });
    sandbox.stub(generatorUtils, "getSampleInfoFromName").resolves(mockedSampleInfo);
  });

  afterEach(async () => {
    sandbox.restore();
    mockedEnvRestore();
    if (await fs.pathExists(tmpDir)) {
      await fs.rm(tmpDir, { recursive: true });
    }
  });

  it("generate sample using download directory", async () => {
    const axiosStub = sandbox.stub(axios, "get");
    const sampleName = "test";
    const mockFileName = "test.txt";
    const mockFileData = "test data";
    const fileInfo = [{ type: "file", path: `${sampleName}/${mockFileName}` }];
    axiosStub.onFirstCall().resolves({ status: 200, data: { tree: fileInfo } });
    axiosStub.onSecondCall().resolves({ status: 200, data: mockFileData });
    const result = await Generator.generateSample(ctx, tmpDir, "test");
    assert.isTrue(result.isOk());
  });

  it("download directory throw api limit error", async () => {
    const axiosStub = sandbox.stub(axios, "get");
    const error = new Error("Network error");
    (error as any).isAxiosError = true;
    (error as any).response = {
      status: 403,
      headers: {
        "x-ratelimit-remaining": "0",
      },
    };
    axiosStub.onSecondCall().rejects(error);
    const result = await Generator.generateSample(ctx, tmpDir, "test");
    assert.isTrue(result.isErr());
    if (result.isErr()) {
      assert.equal(result.error.name, "DownloadSampleApiLimitError");
    }
  });

  it("download directory throw network error", async () => {
    const axiosStub = sandbox.stub(axios, "get");
    axiosStub.onFirstCall().resolves({ status: 502 });
    axiosStub.onSecondCall().resolves({ status: 502 });
    const result = await Generator.generateSample(ctx, tmpDir, "test");
    assert.isTrue(result.isErr());
    if (result.isErr()) {
      assert.equal(result.error.name, "DownloadSampleNetworkError");
    }
  });

  it("throw error if one file download failed", async () => {
    const axiosStub = sandbox.stub(axios, "get");
    const sampleName = "test";
    const mockFileName = "test.txt";
    const mockFileData = "test data";
    const fileInfo = [
      { type: "file", path: `${sampleName}/${mockFileName}` },
      { type: "file", path: `${sampleName}/${mockFileName}_1` },
      { type: "file", path: `${sampleName}/${mockFileName}_2` },
    ];
    axiosStub.onCall(0).resolves({ status: 200, data: { tree: fileInfo } });
    axiosStub.onCall(1).resolves({ status: 200, data: mockFileData });
    axiosStub.onCall(2).resolves({ status: 200, data: mockFileData });
    axiosStub.onCall(3).resolves({ status: 502 });
    axiosStub.onCall(4).resolves({ status: 502 });
    const result = await Generator.generateSample(ctx, tmpDir, "test");
    assert.isTrue(result.isErr());
    if (result.isErr()) {
      assert.equal(result.error.name, "DownloadSampleNetworkError");
    }
    assert.isFalse(await fs.pathExists(path.join(tmpDir, sampleName)));
  });

  it("clean up if downloading failed", async () => {
    const rmStub = sandbox.stub(fs, "rm").resolves();
    const existsStub = sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(generatorUtils, "downloadDirectory").rejects();
    const result = await Generator.generateSample(ctx, tmpDir, "test");
    assert.isTrue(result.isErr());
    if (result.isErr()) {
      assert.equal(result.error.name, "DownloadSampleNetworkError");
    }
    assert.isTrue(rmStub.calledOnce);
    assert.isTrue(existsStub.calledOnce);
  });
});
