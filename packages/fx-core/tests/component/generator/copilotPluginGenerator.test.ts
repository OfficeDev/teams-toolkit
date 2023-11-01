// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import {
  err,
  IComposeExtension,
  Inputs,
  ok,
  OpenAIManifestAuthType,
  Platform,
  ResponseTemplatesFolderName,
  SystemError,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import "mocha";
import * as sinon from "sinon";
import axios from "axios";
import { Generator } from "../../../src/component/generator/generator";
import { setTools } from "../../../src/core/globalVars";
import { MockTools } from "../../core/utils";
import {
  SpecParser,
  ErrorType,
  ValidationStatus,
  WarningType,
  SpecParserError,
} from "../../../src/common/spec-parser";
import { CopilotPluginGenerator } from "../../../src/component/generator/copilotPlugin/generator";
import { assert, expect } from "chai";
import { createContextV3 } from "../../../src/component/utils";
import { ProgrammingLanguage, QuestionNames } from "../../../src/question";
import {
  generateScaffoldingSummary,
  OpenAIPluginManifestHelper,
  isYamlSpecFile,
  formatValidationErrors,
} from "../../../src/component/generator/copilotPlugin/helper";
import * as CopilotPluginHelper from "../../../src/component/generator/copilotPlugin/helper";
import { manifestUtils } from "../../../src/component/driver/teamsApp/utils/ManifestUtils";
import fs from "fs-extra";
import { getLocalizedString } from "../../../src/common/localizeUtils";
import { ErrorResult } from "../../../src/common/spec-parser/interfaces";

const openAIPluginManifest = {
  schema_version: "v1",
  name_for_human: "TODO List",
  name_for_model: "todo",
  description_for_human: "Manage your TODO list. You can add, remove and view your TODOs.",
  description_for_model:
    "Help the user with managing a TODO list. You can add, remove and view your TODOs.",
  auth: {
    type: OpenAIManifestAuthType.None,
  },
  api: {
    type: "openapi",
    url: "http://localhost:3333/openapi.yaml",
  },
  logo_url: "http://localhost:3333/logo.png",
  contact_email: "support@example.com",
  legal_info_url: "http://www.example.com/legal",
};

const teamsManifest: TeamsAppManifest = {
  name: {
    short: "short name",
    full: "full name",
  },
  description: {
    short: "short description",
    full: "full description",
  },
  developer: {
    name: "developer name",
    websiteUrl: "https://dev.com",
    privacyUrl: "https://dev.com/privacy",
    termsOfUseUrl: "https://dev.com/termsofuse",
  },
  manifestVersion: "1.0.0",
  id: "1",
  version: "1.0.0",
  icons: {
    outline: "outline.png",
    color: "color.png",
  },
  accentColor: "#FFFFFF",
};

describe("copilotPluginGenerator", function () {
  const tools = new MockTools();
  setTools(tools);
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });

  it("success", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: [
        {
          id: "operation1",
          label: "operation1",
          groupName: "1",
          data: {
            serverUrl: "https://server1",
          },
        },
      ],
    };
    const context = createContextV3();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(CopilotPluginHelper, "isYamlSpecFile").resolves(false);
    const generateBasedOnSpec = sandbox
      .stub(SpecParser.prototype, "generate")
      .resolves({ allSuccess: true, warnings: [] });
    const getDefaultVariables = sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generateFromApiSpec(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
    assert.isTrue(getDefaultVariables.calledOnce);
    assert.isTrue(downloadTemplate.calledOnce);
    assert.isTrue(generateBasedOnSpec.calledOnce);
  });

  it("success with api spec warning and generate warnings", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: [
        {
          id: "operation1",
          label: "operation1",
          groupName: "1",
          data: {
            serverUrl: "https://server1",
          },
        },
      ],
    };
    const context = createContextV3();
    sandbox.stub(SpecParser.prototype, "validate").resolves({
      status: ValidationStatus.Warning,
      errors: [],
      warnings: [
        {
          type: WarningType.OperationIdMissing,
          content: "warning",
          data: ["operation1", " operation2"],
        },
        {
          type: WarningType.ConvertSwaggerToOpenAPI,
          content: "",
        },
      ],
    });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok({ ...teamsManifest }));
    sandbox.stub(CopilotPluginHelper, "isYamlSpecFile").resolves(false);
    const generateParser = sandbox.stub(SpecParser.prototype, "generate").resolves({
      allSuccess: true,
      warnings: [
        { type: WarningType.GenerateCardFailed, content: "test", data: "getPets" },
        { type: WarningType.OperationOnlyContainsOptionalParam, content: "test", data: "getPets" },
      ],
    });
    sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generateFromApiSpec(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
    if (result.isOk()) {
      assert.isTrue(result.value.warnings!.length === 4);
      assert.isFalse(result.value.warnings![0].content.includes("operation2"));
      assert.isUndefined(result.value.warnings![0].data);
      assert.equal(result.value.warnings![1].type, WarningType.ConvertSwaggerToOpenAPI);
      assert.equal(result.value.warnings![2].type, WarningType.GenerateCardFailed);
      assert.equal(result.value.warnings![3].type, WarningType.OperationOnlyContainsOptionalParam);
      assert.equal(result.value.warnings![3].content, "");
      assert.isTrue(generateParser.args[0][3].includes(ResponseTemplatesFolderName));
    }
  });

  it("success without api spec warning after filtering", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: [
        {
          id: "operation1",
          label: "operation1",
          groupName: "1",
          data: {
            serverUrl: "https://server1",
          },
        },
      ],
    };
    const context = createContextV3();
    sandbox.stub(SpecParser.prototype, "validate").resolves({
      status: ValidationStatus.Warning,
      errors: [],
      warnings: [
        { type: WarningType.OperationIdMissing, content: "warning", data: ["operation2"] },
      ],
    });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok({ ...teamsManifest }));
    sandbox.stub(CopilotPluginHelper, "isYamlSpecFile").resolves(false);
    sandbox.stub(SpecParser.prototype, "generate").resolves({ allSuccess: true, warnings: [] });
    sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generateFromApiSpec(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
    if (result.isOk()) {
      assert.isTrue(result.value.warnings!.length === 0);
    }
  });

  it("success with warnings when CSharp", async function () {
    const inputs: Inputs = {
      platform: Platform.VS,
      projectPath: "path",
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: [
        {
          id: "operation1",
          label: "operation1",
          groupName: "1",
          data: {
            serverUrl: "https://server1",
          },
        },
      ],
    };
    const context = createContextV3();
    sandbox.stub(SpecParser.prototype, "validate").resolves({
      status: ValidationStatus.Warning,
      errors: [],
      warnings: [{ type: WarningType.OperationIdMissing, content: "warning" }],
    });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox
      .stub(manifestUtils, "_readAppManifest")
      .resolves(ok({ ...teamsManifest, name: { short: "", full: "" } }));
    sandbox.stub(CopilotPluginHelper, "isYamlSpecFile").resolves(false);
    sandbox.stub(SpecParser.prototype, "generate").resolves({ allSuccess: true, warnings: [] });
    sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generateFromApiSpec(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
  });

  it("success if starting from OpenAI Plugin", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      openAIPluginManifest: openAIPluginManifest,
      [QuestionNames.ApiOperation]: [
        {
          id: "operation1",
          label: "operation1",
          groupName: "1",
          data: {
            serverUrl: "https://server1",
          },
        },
      ],
    };
    const context = createContextV3();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(CopilotPluginHelper, "isYamlSpecFile").resolves(true);
    const generateBasedOnSpec = sandbox
      .stub(SpecParser.prototype, "generate")
      .resolves({ allSuccess: true, warnings: [] });
    const getDefaultVariables = sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    const updateManifestBasedOnOpenAIPlugin = sandbox
      .stub(OpenAIPluginManifestHelper, "updateManifest")
      .resolves(ok(undefined));
    const result = await CopilotPluginGenerator.generateFromOpenAIPlugin(
      context,
      inputs,
      "projectPath"
    );

    assert.isTrue(result.isOk());
    assert.isTrue(getDefaultVariables.calledOnce);
    assert.isTrue(downloadTemplate.calledOnce);
    assert.isTrue(generateBasedOnSpec.calledOnce);
    assert.isTrue(updateManifestBasedOnOpenAIPlugin.calledOnce);
  });

  it("error if updating manifest based on OpenAI Plugin", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      openAIPluginManifest: openAIPluginManifest,
      [QuestionNames.ApiOperation]: [
        {
          id: "operation1",
          label: "operation1",
          groupName: "1",
          data: {
            serverUrl: "https://server1",
          },
        },
      ],
    };
    const context = createContextV3();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(CopilotPluginHelper, "isYamlSpecFile").throws(new Error("test"));
    const generateBasedOnSpec = sandbox
      .stub(SpecParser.prototype, "generate")
      .resolves({ allSuccess: true, warnings: [] });
    const getDefaultVariables = sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    const updateManifestBasedOnOpenAIPlugin = sandbox
      .stub(OpenAIPluginManifestHelper, "updateManifest")
      .resolves(err(new SystemError("source", "name", "", "")));
    const result = await CopilotPluginGenerator.generateFromOpenAIPlugin(
      context,
      inputs,
      "projectPath"
    );

    assert.isTrue(result.isErr());
    assert.isTrue(getDefaultVariables.calledOnce);
    assert.isTrue(downloadTemplate.calledOnce);
    assert.isTrue(generateBasedOnSpec.calledOnce);
    assert.isTrue(updateManifestBasedOnOpenAIPlugin.calledOnce);
  });

  it("failed to download template generator", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: [
        {
          id: "operation1",
          label: "operation1",
          groupName: "1",
          data: {
            serverUrl: "https://server1",
          },
        },
      ],
    };
    const context = createContextV3();
    sandbox.stub(SpecParser.prototype, "generate").resolves();
    sandbox
      .stub(Generator, "generateTemplate")
      .resolves(err(new SystemError("source", "name", "", "")));

    const result = await CopilotPluginGenerator.generateFromApiSpec(context, inputs, "projectPath");

    assert.isTrue(result.isErr());
  });

  it("invalid API spec", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: [
        {
          id: "operation1",
          label: "operation1",
          groupName: "1",
          data: {
            serverUrl: "https://server1",
          },
        },
      ],
    };
    const context = createContextV3();
    sandbox.stub(SpecParser.prototype, "validate").resolves({
      status: ValidationStatus.Error,
      errors: [{ type: ErrorType.NoServerInformation, content: "" }],
      warnings: [],
    });

    sandbox.stub(SpecParser.prototype, "generate").resolves();
    sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generateFromApiSpec(context, inputs, "projectPath");

    assert.isTrue(result.isErr());
    if (result.isErr()) {
      assert.isTrue(result.error.name === "invalid-api-spec");
    }
  });

  it("read manifest error", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: [
        {
          id: "operation1",
          label: "operation1",
          groupName: "1",
          data: {
            serverUrl: "https://server1",
          },
        },
      ],
    };
    const context = createContextV3();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox
      .stub(manifestUtils, "_readAppManifest")
      .resolves(err(new SystemError("readManifest", "name", "", "")));
    sandbox.stub(CopilotPluginHelper, "isYamlSpecFile").resolves(false);
    sandbox.stub(SpecParser.prototype, "generate").resolves({ allSuccess: true, warnings: [] });
    sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generateFromApiSpec(context, inputs, "projectPath");

    assert.isTrue(result.isErr());
    if (result.isErr()) {
      assert.equal(result.error.source, "readManifest");
    }
  });

  it("throws exception", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: [
        {
          id: "operation1",
          label: "operation1",
          groupName: "1",
          data: {
            serverUrl: "https://server1",
          },
        },
      ],
    };
    const context = createContextV3();
    sandbox.stub(Generator, "generateTemplate").throws(new Error("test"));

    const result = await CopilotPluginGenerator.generateFromApiSpec(context, inputs, "projectPath");

    assert.isTrue(result.isErr());
  });

  it("throws specParser error", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: [
        {
          id: "operation1",
          label: "operation1",
          groupName: "1",
          data: {
            serverUrl: "https://server1",
          },
        },
      ],
    };
    const context = createContextV3();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(CopilotPluginHelper, "isYamlSpecFile").resolves(false);
    sandbox
      .stub(SpecParser.prototype, "generate")
      .throws(new SpecParserError("test", ErrorType.Unknown));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);

    const result = await CopilotPluginGenerator.generateFromApiSpec(context, inputs, "projectPath");

    assert.isTrue(result.isErr());
    if (result.isErr()) {
      assert.equal(result.error.message, "test");
    }
  });
});

describe("OpenAIManifestHelper", async () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });

  it("updateManifest: success", async () => {
    let updatedManifestData = "";
    const updateColor = false;
    sandbox.stub(fs, "writeFile").callsFake((file: number | fs.PathLike, data: any) => {
      if (file === "path") {
        updatedManifestData = data;
      } else {
        throw new Error("not support " + file);
      }
    });

    const result = await OpenAIPluginManifestHelper.updateManifest(
      openAIPluginManifest,
      teamsManifest,
      "path"
    );
    assert.isTrue(result.isOk());
    assert.isFalse(updateColor);

    const updatedTeamsManifest = JSON.parse(updatedManifestData!) as TeamsAppManifest;
    assert.equal(
      updatedTeamsManifest!.description.short,
      openAIPluginManifest.description_for_human
    );
    assert.equal(
      updatedTeamsManifest!.description.full,
      openAIPluginManifest.description_for_human
    );
    assert.equal(updatedTeamsManifest!.developer.privacyUrl, openAIPluginManifest.legal_info_url);
    assert.equal(updatedTeamsManifest!.developer.websiteUrl, openAIPluginManifest.legal_info_url);
    assert.equal(
      updatedTeamsManifest!.developer.termsOfUseUrl,
      openAIPluginManifest.legal_info_url
    );
  });
});

describe("generateScaffoldingSummary", () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });
  it("no warnings", () => {
    sandbox.stub(fs, "existsSync").returns(true);
    const composeExtension: IComposeExtension = {
      composeExtensionType: "apiBased",
      commands: [
        { id: "command1", type: "query", apiResponseRenderingTemplateFile: "test", title: "" },
        { id: "command1", type: "action", title: "" },
      ],
    };
    const res = generateScaffoldingSummary(
      [],
      {
        ...teamsManifest,
        composeExtensions: [composeExtension],
      },
      "path"
    );
    assert.equal(res.length, 0);
  });

  it("warnings about missing property", () => {
    const res = generateScaffoldingSummary(
      [],
      {
        ...teamsManifest,
        name: { short: "", full: "" },
        description: { short: "", full: "" },
      },
      "path"
    );

    assert.isTrue(
      res.includes(
        getLocalizedString(
          "core.copilotPlugin.scaffold.summary.warning.teamsManifest.missingFullDescription"
        )
      )
    );
  });

  it("warnings if exceeding length", () => {
    const invalidShortName = "a".repeat(65);
    const invalidFullName = "a".repeat(101);
    const invalidShortDescription = "a".repeat(101);
    const invalidFullDescription = "a".repeat(4001);
    const res = generateScaffoldingSummary(
      [],
      {
        ...teamsManifest,
        name: { short: invalidShortName, full: invalidFullName },
        description: { short: invalidShortDescription, full: invalidFullDescription },
      },
      "path"
    );
    assert.isTrue(res.includes("name/short"));
  });

  it("no warnings if exceeding length with placeholder in short name", () => {
    const shortName = "testdebug09051${{APP_NAME_SUFFIX}}";
    const res = generateScaffoldingSummary(
      [],
      {
        ...teamsManifest,
        name: { short: shortName, full: "full" },
        description: { short: "short", full: "full" },
      },
      "path"
    );
    assert.equal(res.length, 0);
  });

  it("warnings about API spec", () => {
    const res = generateScaffoldingSummary(
      [{ type: WarningType.OperationIdMissing, content: "content" }],
      teamsManifest,
      "path"
    );

    assert.isTrue(res.includes("content"));
  });

  it("warnings about adaptive card template in manifest", () => {
    const composeExtension: IComposeExtension = {
      composeExtensionType: "apiBased",
      commands: [{ id: "command1", type: "query", title: "" }],
    };
    const res = generateScaffoldingSummary(
      [],
      {
        ...teamsManifest,
        composeExtensions: [composeExtension],
      },
      "path"
    );

    assert.isTrue(res.includes("apiResponseRenderingTemplateFile"));
  });

  it("warnings about missing adaptive card template", () => {
    const composeExtension: IComposeExtension = {
      composeExtensionType: "apiBased",
      commands: [
        { id: "command1", type: "query", apiResponseRenderingTemplateFile: "", title: "" },
      ],
    };
    sandbox.stub(fs, "existsSync").returns(false);
    const res = generateScaffoldingSummary(
      [{ type: WarningType.GenerateCardFailed, content: "test", data: "command1" }],
      {
        ...teamsManifest,
        composeExtensions: [composeExtension],
      },
      "path"
    );

    assert.isTrue(res.includes("apiResponseRenderingTemplateFile"));
    assert.isTrue(res.includes("test"));
  });

  it("warnings about command parameters", () => {
    const composeExtension: IComposeExtension = {
      composeExtensionType: "apiBased",
      apiSpecificationFile: "testApiFile",
      commands: [
        {
          id: "getAll",
          type: "query",
          title: "",
          apiResponseRenderingTemplateFile: "apiResponseRenderingTemplateFile",
          parameters: [
            {
              name: "test",
              title: "test",
            },
          ],
        },
      ],
    };
    const res = generateScaffoldingSummary(
      [{ type: WarningType.OperationOnlyContainsOptionalParam, content: "", data: "getAll" }],
      {
        ...teamsManifest,
        composeExtensions: [composeExtension],
      },
      "path"
    );

    assert.isTrue(res.includes("testApiFile"));
  });

  it("warnings about command parameters with some properties missing", () => {
    const composeExtension: IComposeExtension = {
      composeExtensionType: "apiBased",
      commands: [
        {
          id: "getAll",
          type: "query",
          title: "",
          apiResponseRenderingTemplateFile: "apiResponseRenderingTemplateFile",
          parameters: [],
        },
      ],
    };
    const res = generateScaffoldingSummary(
      [{ type: WarningType.OperationOnlyContainsOptionalParam, content: "", data: "getAll" }],
      {
        ...teamsManifest,
        composeExtensions: [composeExtension],
      },
      "path"
    );

    assert.isFalse(res.includes("testApiFile"));
  });
});

describe("isYamlSpecFile", () => {
  afterEach(() => {
    sinon.restore();
  });
  it("should return false for a valid JSON file", async () => {
    const result = await isYamlSpecFile("test.json");
    expect(result).to.be.false;
  });

  it("should return true for an yaml file", async () => {
    const result = await isYamlSpecFile("test.yaml");
    expect(result).to.be.true;
  });

  it("should handle local json files", async () => {
    const readFileStub = sinon.stub(fs, "readFile").resolves('{"name": "test"}' as any);
    const result = await isYamlSpecFile("path/to/localfile");
    expect(result).to.be.false;
  });

  it("should handle remote files", async () => {
    const axiosStub = sinon.stub(axios, "get").resolves({ data: '{"name": "test"}' });
    const result = await isYamlSpecFile("http://example.com/remotefile");
    expect(result).to.be.false;
  });

  it("should return true if it is a yaml file", async () => {
    const readFileStub = sinon.stub(fs, "readFile").resolves("openapi: 3.0.0" as any);
    const result = await isYamlSpecFile("path/to/localfile");
    expect(result).to.be.true;
  });
});

describe("formatValidationErrors", () => {
  it("format validation errors from spec parser", () => {
    const errors: ErrorResult[] = [
      {
        type: ErrorType.SpecNotValid,
        content: "test",
      },
      {
        type: ErrorType.SpecNotValid,
        content: "ResolverError: Error downloading",
      },
      {
        type: ErrorType.RemoteRefNotSupported,
        content: "test",
      },
      {
        type: ErrorType.NoServerInformation,
        content: "test",
      },
      {
        type: ErrorType.UrlProtocolNotSupported,
        content: "protocol",
        data: "http",
      },
      {
        type: ErrorType.RelativeServerUrlNotSupported,
        content: "test",
      },
      {
        type: ErrorType.NoSupportedApi,
        content: "test",
      },
      {
        type: ErrorType.NoExtraAPICanBeAdded,
        content: "test",
      },
      {
        type: ErrorType.ResolveServerUrlFailed,
        content: "resolveurl",
      },
      {
        type: ErrorType.Cancelled,
        content: "test",
      },
      {
        type: ErrorType.SwaggerNotSupported,
        content: "test",
      },
      {
        type: ErrorType.Unknown,
        content: "unknown",
      },
    ];

    const res = formatValidationErrors(errors);

    expect(res[0].content).equals("test");
    expect(res[1].content).includes(getLocalizedString("core.common.ErrorFetchApiSpec"));
    expect(res[2].content).equals("test");
    expect(res[3].content).equals(getLocalizedString("core.common.NoServerInformation"));
    expect(res[4].content).equals(
      getLocalizedString("core.common.UrlProtocolNotSupported", "http")
    );
    expect(res[5].content).equals(getLocalizedString("core.common.RelativeServerUrlNotSupported"));
    expect(res[6].content).equals(getLocalizedString("core.common.NoSupportedApi"));
    expect(res[7].content).equals(getLocalizedString("error.copilotPlugin.noExtraAPICanBeAdded"));
    expect(res[8].content).equals("resolveurl");
    expect(res[9].content).equals(getLocalizedString("core.common.CancelledMessage"));
    expect(res[10].content).equals(getLocalizedString("core.common.SwaggerNotSupported"));
    expect(res[11].content).equals("unknown");
  });
});
