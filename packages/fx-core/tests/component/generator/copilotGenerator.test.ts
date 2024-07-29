// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import {
  ErrorResult,
  ErrorType,
  SpecParser,
  SpecParserError,
  ValidationStatus,
  WarningType,
} from "@microsoft/m365-spec-parser";
import {
  ApiOperation,
  IComposeExtension,
  Inputs,
  Platform,
  ResponseTemplatesFolderName,
  SystemError,
  TeamsAppManifest,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import axios from "axios";
import { assert, expect } from "chai";
import fs from "fs-extra";
import "mocha";
import { OpenAPIV3 } from "openapi-types";
import path from "path";
import * as sinon from "sinon";
import { format } from "util";
import { createContext, setTools } from "../../../src/common/globalVars";
import { getLocalizedString } from "../../../src/common/localizeUtils";
import { manifestUtils } from "../../../src/component/driver/teamsApp/utils/ManifestUtils";
import { PluginManifestUtils } from "../../../src/component/driver/teamsApp/utils/PluginManifestUtils";
import {
  SpecGenerator,
  OpenAPISpecGenerator,
} from "../../../src/component/generator/apiSpec/generator";
import * as CopilotPluginHelper from "../../../src/component/generator/apiSpec/helper";
import {
  formatValidationErrors,
  generateScaffoldingSummary,
  isYamlSpecFile,
  listPluginExistingOperations,
} from "../../../src/component/generator/apiSpec/helper";
import { Generator } from "../../../src/component/generator/generator";
import {
  ApiPluginStartOptions,
  CapabilityOptions,
  CustomCopilotRagOptions,
  MeArchitectureOptions,
  ProgrammingLanguage,
  QuestionNames,
  apiPluginApiSpecOptionId,
} from "../../../src/question";
import { MockTools } from "../../core/utils";

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

describe("OpenAPISpecGenerator", function () {
  const tools = new MockTools();
  setTools(tools);
  const sandbox = sinon.createSandbox();

  const apiOperations: ApiOperation[] = [
    {
      id: "operation1",
      label: "operation1",
      groupName: "1",
      data: {
        serverUrl: "https://server1",
      },
    },
    {
      id: "operation2",
      label: "operation2",
      groupName: "1",
      data: {
        serverUrl: "https://server1",
        authName: "auth",
      },
    },
  ];

  afterEach(async () => {
    sandbox.restore();
  });

  it("success", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: ["operation1"],
      supportedApisFromApiSpec: apiOperations,
    };
    const context = createContext();
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

    const result = await OpenAPISpecGenerator.generateMe(context, inputs, "projectPath", {
      telemetryProps: {
        "project-id": "test",
      },
    });

    assert.isTrue(result.isOk());
    assert.isTrue(getDefaultVariables.calledOnce);
    assert.isTrue(downloadTemplate.calledOnce);
    assert.isTrue(generateBasedOnSpec.calledOnce);
    assert.equal(downloadTemplate.args[0][2], "copilot-plugin-existing-api");
  });

  it("success with API Key authentication", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.AppName]: "test",
      [QuestionNames.ApiSpecLocation]: "test.json",
      [QuestionNames.ApiOperation]: ["operation2"],
      supportedApisFromApiSpec: apiOperations,
      apiAuthData: {
        authType: "apiKey",
        serverUrl: "",
      },
    };
    const context = createContext();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(CopilotPluginHelper, "isYamlSpecFile").resolves(false);
    const generateBasedOnSpec = sandbox
      .stub(SpecParser.prototype, "generate")
      .resolves({ allSuccess: true, warnings: [] });
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OpenAPISpecGenerator.generateMe(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
    assert.equal(downloadTemplate.args[0][2], "copilot-plugin-existing-api");
    assert.isTrue(downloadTemplate.calledOnce);
    assert.isTrue(generateBasedOnSpec.calledOnce);
  });

  it("API plugin success", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.Capabilities]: CapabilityOptions.apiPlugin().id,
      [QuestionNames.ApiPluginType]: ApiPluginStartOptions.apiSpec().id,
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: ["operation1"],
      supportedApisFromApiSpec: apiOperations,
    };
    const context = createContext();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(CopilotPluginHelper, "isYamlSpecFile").resolves(false);
    const generateBasedOnSpec = sandbox
      .stub(SpecParser.prototype, "generateForCopilot")
      .resolves({ allSuccess: true, warnings: [] });
    const getDefaultVariables = sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OpenAPISpecGenerator.generateCopilotPlugin(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
    assert.isTrue(getDefaultVariables.calledOnce);
    assert.isTrue(downloadTemplate.calledOnce);
    assert.isTrue(generateBasedOnSpec.calledOnce);
    assert.equal(downloadTemplate.args[0][2], "api-plugin-existing-api");
  });

  it("success with api spec warning and generate warnings", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
      [QuestionNames.ApiSpecLocation]: "test.json",
      [QuestionNames.ApiOperation]: ["operation1"],
      supportedApisFromApiSpec: apiOperations,
    };
    const context = createContext();
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

    const result = await OpenAPISpecGenerator.generateMe(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
    if (result.isOk()) {
      assert.isTrue(result.value.warnings!.length === 4);
      assert.isFalse(result.value.warnings![0].content.includes("operation2"));
      assert.isUndefined(result.value.warnings![0].data);
      assert.equal(result.value.warnings![1].type, WarningType.ConvertSwaggerToOpenAPI);
      assert.equal(result.value.warnings![2].type, WarningType.GenerateCardFailed);
      assert.equal(result.value.warnings![3].type, WarningType.OperationOnlyContainsOptionalParam);
      assert.equal(result.value.warnings![3].content, "");
      assert.isTrue(generateParser.args[0][3]?.includes(ResponseTemplatesFolderName));
    }
  });

  it("success without api spec warning after filtering", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: ["operation1"],
      supportedApisFromApiSpec: apiOperations,
    };
    const context = createContext();
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

    const result = await OpenAPISpecGenerator.generateMe(context, inputs, "projectPath");

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
      [QuestionNames.ApiSpecLocation]: "test.yaml",
      [QuestionNames.ApiOperation]: ["operation1"],
      supportedApisFromApiSpec: apiOperations,
    };
    const context = createContext();
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

    const result = await OpenAPISpecGenerator.generateMe(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
  });

  it("failed to download template generator", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "test.yml",
      [QuestionNames.ApiOperation]: ["operation1"],
      supportedApisFromApiSpec: apiOperations,
    };
    const context = createContext();
    sandbox.stub(SpecParser.prototype, "generate").resolves();
    sandbox
      .stub(Generator, "generateTemplate")
      .resolves(err(new SystemError("source", "name", "", "")));

    const result = await OpenAPISpecGenerator.generateMe(context, inputs, "projectPath");

    assert.isTrue(result.isErr());
  });

  it("invalid API spec", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "test.yaml",
      [QuestionNames.ApiOperation]: ["operation1"],
      supportedApisFromApiSpec: apiOperations,
    };
    const context = createContext();
    sandbox.stub(SpecParser.prototype, "validate").resolves({
      status: ValidationStatus.Error,
      errors: [{ type: ErrorType.NoServerInformation, content: "" }],
      warnings: [],
    });

    sandbox.stub(SpecParser.prototype, "generate").resolves();
    sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OpenAPISpecGenerator.generateMe(context, inputs, "projectPath");

    assert.isTrue(result.isErr());
    if (result.isErr()) {
      assert.isTrue(result.error.name === "invalid-api-spec");
    }
  });

  it("read manifest error", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "test.yaml",
      [QuestionNames.ApiOperation]: ["operation1"],
      supportedApisFromApiSpec: apiOperations,
    };
    const context = createContext();
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

    const result = await OpenAPISpecGenerator.generateMe(context, inputs, "projectPath");

    assert.isTrue(result.isErr());
    if (result.isErr()) {
      assert.equal(result.error.source, "readManifest");
    }
  });

  it("throws exception", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "test.yaml",
      [QuestionNames.ApiOperation]: ["operation1"],
    };
    const context = createContext();
    sandbox.stub(Generator, "generateTemplate").throws(new Error("test"));

    const result = await OpenAPISpecGenerator.generateMe(context, inputs, "projectPath");

    assert.isTrue(result.isErr());
  });

  it("throws specParser error", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: ["operation1"],
      supportedApisFromApiSpec: apiOperations,
    };
    const context = createContext();
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

    const result = await OpenAPISpecGenerator.generateMe(context, inputs, "projectPath");

    assert.isTrue(result.isErr());
    if (result.isErr()) {
      assert.equal(result.error.message, "test");
    }
  });

  it("generateCustomCopilot: success", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.TS,
      [QuestionNames.ApiSpecLocation]: "test.yaml",
      [QuestionNames.ApiOperation]: ["operation1"],
    };
    const context = createContext();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(SpecParser.prototype, "getFilteredSpecs").resolves([
      {
        openapi: "3.0.0",
        info: {
          title: "test",
          version: "1.0",
        },
        paths: {},
      },
      {
        openapi: "3.0.0",
        info: {
          title: "test",
          version: "1.0",
        },
        paths: {},
      },
    ]);
    sandbox.stub(CopilotPluginHelper, "updateForCustomApi").resolves();
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(CopilotPluginHelper, "isYamlSpecFile").resolves(false);
    const generateBasedOnSpec = sandbox
      .stub(SpecParser.prototype, "generate")
      .resolves({ allSuccess: true, warnings: [] });
    const getDefaultVariables = sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OpenAPISpecGenerator.generateCustomCopilot(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
    assert.isTrue(getDefaultVariables.calledOnce);
    assert.isTrue(downloadTemplate.notCalled);
    assert.isTrue(generateBasedOnSpec.calledOnce);
  });

  it("generateCustomCopilot: error", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.TS,
      [QuestionNames.ApiSpecLocation]: "test.yaml",
      [QuestionNames.ApiOperation]: ["operation1"],
    };
    const context = createContext();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(SpecParser.prototype, "getFilteredSpecs").resolves([
      {
        openapi: "3.0.0",
        info: {
          title: "test",
          version: "1.0",
        },
        paths: {},
      },
      {
        openapi: "3.0.0",
        info: {
          title: "test",
          version: "1.0",
        },
        paths: {},
      },
    ]);
    sandbox.stub(CopilotPluginHelper, "updateForCustomApi").throws(new Error("test"));
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(CopilotPluginHelper, "isYamlSpecFile").resolves(false);
    const generateBasedOnSpec = sandbox
      .stub(SpecParser.prototype, "generate")
      .resolves({ allSuccess: true, warnings: [] });
    const getDefaultVariables = sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox
      .stub(SpecGenerator.prototype, "getTemplateName")
      .returns("custom-copilot-rag-custom-api");
    const result = await OpenAPISpecGenerator.generateCustomCopilot(context, inputs, "projectPath");

    assert.isTrue(result.isErr() && result.error.message === "test");
  });

  it("generate for oauth: success", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.AppName]: "test",
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.TS,
      [QuestionNames.ApiSpecLocation]: "test.yaml",
      [QuestionNames.ApiOperation]: ["operation1"],
      [QuestionNames.Capabilities]: CapabilityOptions.apiPlugin().id,
      [QuestionNames.ApiPluginType]: ApiPluginStartOptions.apiSpec().id,
      supportedApisFromApiSpec: [
        {
          id: "operation1",
          label: "operation1",
          groupName: "1",
          data: {
            serverUrl: "https://server1",
            authName: "auth",
            authType: "oauth2",
          },
        },
      ] as ApiOperation[],
    };
    const context = createContext();

    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(CopilotPluginHelper, "isYamlSpecFile").resolves(false);
    sandbox.stub(SpecGenerator.prototype, "getTemplateName").returns("api-plugin-existing-api");
    const generateBasedOnSpec = sandbox
      .stub(SpecParser.prototype, "generateForCopilot")
      .resolves({ allSuccess: true, warnings: [] });
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OpenAPISpecGenerator.generateCopilotPlugin(context, inputs, "projectPath");
    assert.isTrue(result.isOk());
    assert.equal(downloadTemplate.args[0][2], "api-plugin-existing-api");
    assert.isTrue(downloadTemplate.calledOnce);
    assert.isTrue(generateBasedOnSpec.calledOnce);
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
        data: [],
      },
      {
        type: ErrorType.NoSupportedApi,
        content: "test",
        data: [
          {
            api: "GET /api",
            reason: [
              ErrorType.AuthTypeIsNotSupported,
              ErrorType.MissingOperationId,
              ErrorType.PostBodyContainMultipleMediaTypes,
              ErrorType.ResponseContainMultipleMediaTypes,
              ErrorType.ResponseJsonIsEmpty,
              ErrorType.PostBodySchemaIsNotJson,
              ErrorType.MethodNotAllowed,
              ErrorType.UrlPathNotExist,
            ],
          },
          {
            api: "GET /api2",
            reason: [
              ErrorType.PostBodyContainsRequiredUnsupportedSchema,
              ErrorType.ParamsContainRequiredUnsupportedSchema,
              ErrorType.ParamsContainsNestedObject,
              ErrorType.RequestBodyContainsNestedObject,
              ErrorType.ExceededRequiredParamsLimit,
              ErrorType.NoParameter,
              ErrorType.NoAPIInfo,
              ErrorType.CircularReferenceNotSupported,
            ],
          },
          { api: "GET /api3", reason: ["unknown"] },
        ],
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
        type: ErrorType.SpecVersionNotSupported,
        content: "test",
        data: "3.1.0",
      },
      {
        type: ErrorType.Unknown,
        content: "unknown",
      },
      {
        type: ErrorType.AddedAPINotInOriginalSpec,
        content: "test",
      },
    ];

    const res = formatValidationErrors(errors, {
      platform: Platform.VSCode,
      [QuestionNames.ManifestPath]: "testmanifest.json",
    });

    expect(res[0].content).equals("test");
    expect(res[1].content).includes(getLocalizedString("core.common.ErrorFetchApiSpec"));
    expect(res[2].content).equals("test");
    expect(res[3].content).equals(getLocalizedString("core.common.NoServerInformation"));
    expect(res[4].content).equals(
      getLocalizedString("core.common.UrlProtocolNotSupported", "http")
    );
    expect(res[5].content).equals(getLocalizedString("core.common.RelativeServerUrlNotSupported"));
    expect(res[6].content).equals(
      getLocalizedString(
        "core.common.NoSupportedApi",
        getLocalizedString("core.common.invalidReason.NoAPIs")
      )
    );

    const errorMessage1 = [
      getLocalizedString("core.common.invalidReason.AuthTypeIsNotSupported"),
      getLocalizedString("core.common.invalidReason.MissingOperationId"),
      getLocalizedString("core.common.invalidReason.PostBodyContainMultipleMediaTypes"),
      getLocalizedString("core.common.invalidReason.ResponseContainMultipleMediaTypes"),
      getLocalizedString("core.common.invalidReason.ResponseJsonIsEmpty"),
      getLocalizedString("core.common.invalidReason.PostBodySchemaIsNotJson"),
      getLocalizedString("core.common.invalidReason.MethodNotAllowed"),
      getLocalizedString("core.common.invalidReason.UrlPathNotExist"),
    ];
    const errorMessage2 = [
      getLocalizedString("core.common.invalidReason.PostBodyContainsRequiredUnsupportedSchema"),
      getLocalizedString("core.common.invalidReason.ParamsContainRequiredUnsupportedSchema"),
      getLocalizedString("core.common.invalidReason.ParamsContainsNestedObject"),
      getLocalizedString("core.common.invalidReason.RequestBodyContainsNestedObject"),
      getLocalizedString("core.common.invalidReason.ExceededRequiredParamsLimit"),
      getLocalizedString("core.common.invalidReason.NoParameter"),
      getLocalizedString("core.common.invalidReason.NoAPIInfo"),
      getLocalizedString("core.common.invalidReason.CircularReference"),
    ];

    expect(res[7].content).equals(
      getLocalizedString(
        "core.common.NoSupportedApi",
        "GET /api: " +
          errorMessage1.join(", ") +
          "\n" +
          "GET /api2: " +
          errorMessage2.join(", ") +
          "\n" +
          "GET /api3: unknown"
      )
    );
    expect(res[8].content).equals(getLocalizedString("error.apime.noExtraAPICanBeAdded"));
    expect(res[9].content).equals("resolveurl");
    expect(res[10].content).equals(getLocalizedString("core.common.CancelledMessage"));
    expect(res[11].content).equals(getLocalizedString("core.common.SwaggerNotSupported"));
    expect(res[12].content).equals(
      format(getLocalizedString("core.common.SpecVersionNotSupported"), res[12].data)
    );
    expect(res[13].content).equals("unknown");
    expect(res[14].content).equals(getLocalizedString("core.common.AddedAPINotInOriginalSpec"));
  });

  it("format validation errors from spec parser: copilot", () => {
    const errors: ErrorResult[] = [
      {
        type: ErrorType.NoSupportedApi,
        content: "test",
        data: [
          {
            api: "GET /api",
            reason: [
              ErrorType.AuthTypeIsNotSupported,
              ErrorType.MissingOperationId,
              ErrorType.PostBodyContainMultipleMediaTypes,
              ErrorType.ResponseContainMultipleMediaTypes,
              ErrorType.ResponseJsonIsEmpty,
              ErrorType.PostBodySchemaIsNotJson,
              ErrorType.MethodNotAllowed,
              ErrorType.UrlPathNotExist,
            ],
          },
          {
            api: "GET /api2",
            reason: [
              ErrorType.PostBodyContainsRequiredUnsupportedSchema,
              ErrorType.ParamsContainRequiredUnsupportedSchema,
              ErrorType.ParamsContainsNestedObject,
              ErrorType.RequestBodyContainsNestedObject,
              ErrorType.ExceededRequiredParamsLimit,
              ErrorType.NoParameter,
              ErrorType.NoAPIInfo,
            ],
          },
          { api: "GET /api3", reason: ["unknown"] },
        ],
      },
      {
        type: ErrorType.NoExtraAPICanBeAdded,
        content: "test",
      },
    ];

    const res = formatValidationErrors(errors, {
      platform: Platform.VSCode,
      [QuestionNames.ApiPluginType]: apiPluginApiSpecOptionId,
    });

    const errorMessage1 = [
      getLocalizedString("core.common.invalidReason.AuthTypeIsNotSupported"),
      getLocalizedString("core.common.invalidReason.MissingOperationId"),
      getLocalizedString("core.common.invalidReason.PostBodyContainMultipleMediaTypes"),
      getLocalizedString("core.common.invalidReason.ResponseContainMultipleMediaTypes"),
      getLocalizedString("core.common.invalidReason.ResponseJsonIsEmpty"),
      getLocalizedString("core.common.invalidReason.PostBodySchemaIsNotJson"),
      getLocalizedString("core.common.invalidReason.MethodNotAllowed"),
      getLocalizedString("core.common.invalidReason.UrlPathNotExist"),
    ];
    const errorMessage2 = [
      getLocalizedString("core.common.invalidReason.PostBodyContainsRequiredUnsupportedSchema"),
      getLocalizedString("core.common.invalidReason.ParamsContainRequiredUnsupportedSchema"),
      getLocalizedString("core.common.invalidReason.ParamsContainsNestedObject"),
      getLocalizedString("core.common.invalidReason.RequestBodyContainsNestedObject"),
      getLocalizedString("core.common.invalidReason.ExceededRequiredParamsLimit"),
      getLocalizedString("core.common.invalidReason.NoParameter"),
      getLocalizedString("core.common.invalidReason.NoAPIInfo"),
    ];

    expect(res[0].content).equals(
      getLocalizedString(
        "core.common.NoSupportedApiCopilot",
        "GET /api: " +
          errorMessage1.join(", ") +
          "\n" +
          "GET /api2: " +
          errorMessage2.join(", ") +
          "\n" +
          "GET /api3: unknown"
      )
    );
    expect(res[1].content).equals(getLocalizedString("error.copilot.noExtraAPICanBeAdded"));
  });
});

describe("listPluginExistingOperations", () => {
  const teamsManifestWithPlugin: TeamsAppManifest = {
    ...teamsManifest,
    copilotExtensions: {
      plugins: [
        {
          file: "resources/plugin.json",
          id: "plugin1",
        },
      ],
    },
  };

  const sandbox = sinon.createSandbox();
  afterEach(async () => {
    sandbox.restore();
  });

  it("success", async () => {
    sandbox
      .stub(PluginManifestUtils.prototype, "getApiSpecFilePathFromTeamsManifest")
      .resolves(ok(["openapi.yaml"]));

    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, warnings: [], errors: [] });
    sandbox.stub(SpecParser.prototype, "list").resolves({
      APIs: [
        {
          api: "api1",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test",
            authScheme: {
              type: "http",
              scheme: "bearer",
            },
          },
          isValid: true,
          reason: [],
        },
      ],
      allAPICount: 1,
      validAPICount: 1,
    });
    const res = await listPluginExistingOperations(
      teamsManifestWithPlugin,
      "manifestPath",
      "openapi.yaml"
    );
    expect(res).to.be.deep.equal(["api1"]);
  });

  it("get api spec error", async () => {
    sandbox
      .stub(PluginManifestUtils.prototype, "getApiSpecFilePathFromTeamsManifest")
      .resolves(err(new SystemError("getApiSpecFilePathFromTeamsManifest", "name", "", "")));

    let hasException = false;

    try {
      await listPluginExistingOperations(teamsManifestWithPlugin, "manifestPath", "openapi.yaml");
    } catch (e) {
      hasException = true;
      expect(e.source).equal("getApiSpecFilePathFromTeamsManifest");
    }
    expect(hasException).to.be.true;
  });

  it("openapi is not referenced for plugin", async () => {
    sandbox
      .stub(PluginManifestUtils.prototype, "getApiSpecFilePathFromTeamsManifest")
      .resolves(ok(["openapi.yaml"]));
    let hasException = false;

    try {
      await listPluginExistingOperations(teamsManifestWithPlugin, "manifestPath", "notexist.yaml");
    } catch (e) {
      hasException = true;
      expect(e.source).equal("listPluginExistingOperations");
      expect(e.name).equal("api-spec-not-used-in-plugin");
    }
    expect(hasException).to.be.true;
  });
});

describe("updateForCustomApi", async () => {
  const sandbox = sinon.createSandbox();
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
    },
    description: "test",
    paths: {
      "/hello": {
        get: {
          operationId: "getHello",
          summary: "Returns a greeting",
          parameters: [
            {
              name: "query",
              in: "query",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "A greeting message",
              content: {
                "application/json": {
                  schema: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: "createPet",
          summary: "Create a pet",
          description: "Create a new pet in the store",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: {
                      type: "string",
                      description: "Name of the pet",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  } as OpenAPIV3.Document;

  afterEach(async () => {
    sandbox.restore();
  });

  it("happy path: ts", async () => {
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "writeFile").callsFake((file, data) => {
      if (file === path.join("path", "src", "prompts", "chat", "skprompt.txt")) {
        expect(data).to.contains("The following is a conversation with an AI assistant.");
      } else if (file === path.join("path", "src", "adaptiveCard", "hello.json")) {
        expect(data).to.contains("getHello");
      } else if (file === path.join("path", "src", "prompts", "chat", "actions.json")) {
        expect(data).to.contains("getHello");
      } else if (file === path.join("path", "src", "app", "app.ts")) {
        expect(data).to.contains(`app.ai.action("getHello"`);
        expect(data).not.to.contains("{{");
        expect(data).not.to.contains("// Replace with action code");
      }
    });
    sandbox
      .stub(fs, "readFile")
      .resolves(Buffer.from("test code // Replace with action code {{OPENAPI_SPEC_PATH}}"));
    await CopilotPluginHelper.updateForCustomApi(spec, "typescript", "path", "openapi.yaml");
  });

  it("happy path: js", async () => {
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "writeFile").callsFake((file, data) => {
      if (file === path.join("path", "src", "prompts", "chat", "skprompt.txt")) {
        expect(data).to.contains("The following is a conversation with an AI assistant.");
      } else if (file === path.join("path", "src", "adaptiveCard", "hello.json")) {
        expect(data).to.contains("getHello");
      } else if (file === path.join("path", "src", "prompts", "chat", "actions.json")) {
        expect(data).to.contains("getHello");
      } else if (file === path.join("path", "src", "app", "app.ts")) {
        expect(data).to.contains(`app.ai.action("getHello"`);
        expect(data).not.to.contains("{{");
        expect(data).not.to.contains("// Replace with action code");
      }
    });
    sandbox
      .stub(fs, "readFile")
      .resolves(Buffer.from("test code // Replace with action code {{OPENAPI_SPEC_PATH}}"));
    await CopilotPluginHelper.updateForCustomApi(spec, "javascript", "path", "openapi.yaml");
  });

  it("happy path: python", async () => {
    sandbox.stub(fs, "ensureDir").resolves();
    const mockWriteFile = sandbox.stub(fs, "writeFile").resolves();
    await CopilotPluginHelper.updateForCustomApi(spec, "python", "path", "openapi.yaml");
    expect(mockWriteFile.notCalled).to.be.true;
  });

  it("happy path with spec without path", async () => {
    const limitedSpec = {
      openapi: "3.0.0",
      info: {
        title: "My API",
        version: "1.0.0",
      },
    } as OpenAPIV3.Document;
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "writeFile").callsFake((file, data) => {
      if (file === path.join("path", "src", "prompts", "chat", "skprompt.txt")) {
        expect(data).to.contains("The following is a conversation with an AI assistant.");
      } else if (file === path.join("path", "src", "prompts", "chat", "actions.json")) {
        expect(data).to.equals("[]");
      } else if (file === path.join("path", "src", "app", "app.ts")) {
        expect(data).not.to.contains("{{");
        expect(data).not.to.contains("// Replace with action code");
      }
    });
    sandbox
      .stub(fs, "readFile")
      .resolves(Buffer.from("test code // Replace with action code {{OPENAPI_SPEC_PATH}}"));
    await CopilotPluginHelper.updateForCustomApi(limitedSpec, "javascript", "path", "openapi.yaml");
  });

  it("happy path with spec without pathItem", async () => {
    const limitedSpec = {
      openapi: "3.0.0",
      info: {
        title: "My API",
        version: "1.0.0",
      },
      paths: {},
    } as OpenAPIV3.Document;
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "writeFile").callsFake((file, data) => {
      if (file === path.join("path", "src", "prompts", "chat", "skprompt.txt")) {
        expect(data).to.contains("The following is a conversation with an AI assistant.");
      } else if (file === path.join("path", "src", "prompts", "chat", "actions.json")) {
        expect(data).to.equals("[]");
      } else if (file === path.join("path", "src", "app", "app.ts")) {
        expect(data).not.to.contains("{{");
        expect(data).not.to.contains("// Replace with action code");
      }
    });
    sandbox
      .stub(fs, "readFile")
      .resolves(Buffer.from("test code // Replace with action code {{OPENAPI_SPEC_PATH}}"));
    await CopilotPluginHelper.updateForCustomApi(limitedSpec, "javascript", "path", "openapi.yaml");
  });

  it("happy path with spec with patch", async () => {
    const limitedSpec = {
      openapi: "3.0.0",
      info: {
        title: "My API",
        version: "1.0.0",
      },
      paths: {
        patch: {
          operationId: "createPet",
          summary: "Create a pet",
          description: "Create a new pet in the store",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: {
                      type: "string",
                      description: "Name of the pet",
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as OpenAPIV3.Document;
    sandbox.stub(fs, "ensureDir").resolves();
    const mockWriteFile = sandbox.stub(fs, "writeFile").callsFake((file, data) => {
      if (file === path.join("path", "src", "prompts", "chat", "skprompt.txt")) {
        expect(data).to.contains("The following is a conversation with an AI assistant.");
      } else if (file === path.join("path", "src", "adaptiveCard", "hello.json")) {
        expect(data).to.equals("[]");
      } else if (file === path.join("path", "src", "prompts", "chat", "actions.json")) {
        expect(data).to.equals("[]");
      } else if (file === path.join("path", "src", "app", "app.ts")) {
        expect(data).not.to.contains("{{");
        expect(data).not.to.contains("// Replace with action code");
      }
    });
    sandbox
      .stub(fs, "readFile")
      .resolves(Buffer.from("test code // Replace with action code {{OPENAPI_SPEC_PATH}}"));
    await CopilotPluginHelper.updateForCustomApi(limitedSpec, "javascript", "path", "openapi.yaml");
    expect(mockWriteFile.calledThrice).to.be.true;
  });

  it("happy path with spec with required and multiple parameter", async () => {
    const newSpec = {
      openapi: "3.0.0",
      info: {
        title: "My API",
        version: "1.0.0",
      },
      description: "test",
      paths: {
        "/hello": {
          get: {
            operationId: "getHello",
            summary: "Returns a greeting",
            parameters: [
              {
                name: "query",
                in: "query",
                schema: { type: "string" },
                required: true,
              },
              {
                name: "query2",
                in: "query",
                schema: { type: "string" },
                requried: false,
              },
              {
                name: "query3",
                in: "query",
                schema: { type: "string" },
                requried: true,
                description: "test",
              },
            ],
            responses: {
              "200": {
                description: "",
                content: {
                  "application/json": {
                    schema: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          post: {
            operationId: "createPet",
            summary: "Create a pet",
            description: "",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name"],
                    properties: {
                      name: {
                        type: "string",
                        description: "",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as OpenAPIV3.Document;
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "writeFile").callsFake((file, data) => {
      if (file === path.join("path", "src", "prompts", "chat", "skprompt.txt")) {
        expect(data).to.contains("The following is a conversation with an AI assistant.");
      } else if (file === path.join("path", "src", "adaptiveCard", "hello.json")) {
        expect(data).to.contains("getHello");
      } else if (file === path.join("path", "src", "prompts", "chat", "actions.json")) {
        expect(data).to.contains("getHello");
      } else if (file === path.join("path", "src", "app", "app.ts")) {
        expect(data).to.contains(`app.ai.action("getHello"`);
        expect(data).not.to.contains("{{");
        expect(data).not.to.contains("// Replace with action code");
      }
    });
    sandbox
      .stub(fs, "readFile")
      .resolves(Buffer.from("test code // Replace with action code {{OPENAPI_SPEC_PATH}}"));
    await CopilotPluginHelper.updateForCustomApi(newSpec, "typescript", "path", "openapi.yaml");
  });

  it("happy path with spec with auth", async () => {
    const authSpec = {
      openapi: "3.0.0",
      info: {
        title: "My API",
        version: "1.0.0",
      },
      description: "test",
      paths: {
        "/hello": {
          get: {
            operationId: "getHello",
            summary: "Returns a greeting",
            parameters: [
              {
                name: "query",
                in: "query",
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": {
                description: "A greeting message",
                content: {
                  "application/json": {
                    schema: {
                      type: "string",
                    },
                  },
                },
              },
            },
            security: [
              {
                api_key: [],
              },
            ],
          },
          post: {
            operationId: "createPet",
            summary: "Create a pet",
            description: "Create a new pet in the store",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name"],
                    properties: {
                      name: {
                        type: "string",
                        description: "Name of the pet",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          api_key: {
            type: "apiKey",
            name: "api_key",
            in: "header",
          },
        },
      },
    } as OpenAPIV3.Document;
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "writeFile").callsFake((file, data) => {
      if (file === path.join("path", "src", "prompts", "chat", "skprompt.txt")) {
        expect(data).to.contains("The following is a conversation with an AI assistant.");
      } else if (file === path.join("path", "src", "adaptiveCard", "hello.json")) {
        expect(data).to.contains("getHello");
      } else if (file === path.join("path", "src", "prompts", "chat", "actions.json")) {
        expect(data).to.contains("getHello");
      } else if (file === path.join("path", "src", "app", "app.ts")) {
        expect(data).to.contains(`app.ai.action("getHello"`);
        expect(data).not.to.contains("{{");
        expect(data).not.to.contains("// Replace with action code");
      }
    });
    sandbox
      .stub(fs, "readFile")
      .resolves(Buffer.from("test code // Replace with action code {{OPENAPI_SPEC_PATH}}"));
    await CopilotPluginHelper.updateForCustomApi(authSpec, "typescript", "path", "openapi.yaml");
  });
});

describe("listOperations", async () => {
  const context = createContext();
  const sandbox = sinon.createSandbox();
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
    },
    description: "test",
    paths: {
      "/hello": {
        get: {
          operationId: "getHello",
          summary: "Returns a greeting",
          parameters: [
            {
              name: "query",
              in: "query",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "A greeting message",
              content: {
                "application/json": {
                  schema: {
                    type: "string",
                  },
                },
              },
            },
          },
          security: [
            {
              api_key: [],
            },
          ],
        },
        post: {
          operationId: "createPet",
          summary: "Create a pet",
          description: "Create a new pet in the store",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: {
                      type: "string",
                      description: "Name of the pet",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        api_key: {
          type: "apiKey",
          name: "api_key",
          in: "header",
        },
      },
    },
  } as OpenAPIV3.Document;

  afterEach(async () => {
    sandbox.restore();
  });

  it("allow auth for teams ai project", async () => {
    const inputs = {
      "custom-copilot-rag": "custom-copilot-rag-customApi",
      platform: Platform.VSCode,
    };
    sandbox.stub(CopilotPluginHelper, "formatValidationErrors").resolves([]);
    sandbox.stub(CopilotPluginHelper, "logValidationResults").resolves();
    sandbox.stub(SpecParser.prototype, "validate").resolves({
      status: ValidationStatus.Valid,
      warnings: [],
      errors: [],
    });
    sandbox
      .stub(SpecParser.prototype, "list")
      .resolves({ APIs: [], allAPICount: 1, validAPICount: 0 });

    const res = await CopilotPluginHelper.listOperations(context, "", inputs, true, false, "");
    expect(res.isOk()).to.be.true;
  });

  it("will show invalid api reasons", async () => {
    const inputs = {
      "custom-copilot-rag": "custom-copilot-rag-customApi",
      platform: Platform.VSCode,
    };
    sandbox.stub(CopilotPluginHelper, "formatValidationErrors").resolves([]);
    sandbox.stub(CopilotPluginHelper, "logValidationResults").resolves();
    sandbox.stub(SpecParser.prototype, "validate").resolves({
      status: ValidationStatus.Valid,
      warnings: [],
      errors: [],
    });
    sandbox.stub(SpecParser.prototype, "list").resolves({
      APIs: [
        {
          api: "1",
          server: "https://test",
          operationId: "id1",
          isValid: false,
          reason: [ErrorType.NoParameter],
        },
        {
          api: "2",
          server: "https://test",
          operationId: "id2",
          isValid: true,
          reason: [],
        },
      ],
      allAPICount: 2,
      validAPICount: 1,
    });
    const warningSpy = sandbox.spy(context.logProvider, "warning");

    const res = await CopilotPluginHelper.listOperations(context, "", inputs, true, false, "");
    expect(res.isOk()).to.be.true;
    expect(warningSpy.calledOnce).to.be.true;
  });

  it("should throw error if list api not from original OpenAPI spec", async () => {
    const inputs = {
      platform: Platform.VSCode,
      "manifest-path": "fake-path",
    };
    sandbox.stub(CopilotPluginHelper, "formatValidationErrors").resolves([]);
    sandbox.stub(CopilotPluginHelper, "logValidationResults").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok({} as any));
    sandbox.stub(manifestUtils, "getOperationIds").returns(["getHello"]);
    sandbox.stub(CopilotPluginHelper, "listPluginExistingOperations").resolves(["getHello"]);
    sandbox.stub(SpecParser.prototype, "validate").resolves({
      status: ValidationStatus.Valid,
      warnings: [],
      errors: [],
    });
    sandbox.stub(SpecParser.prototype, "list").resolves({
      APIs: [
        {
          api: "GET /api",
          server: "https://test",
          operationId: "getApi",
          isValid: true,
          reason: [],
        },
      ],
      allAPICount: 1,
      validAPICount: 0,
    });

    const res = await CopilotPluginHelper.listOperations(context, "", inputs, false, false, "");
    expect(res.isErr()).to.be.true;
    if (res.isErr()) {
      expect(res.error.length).to.be.equal(1);
      expect(res.error[0].type).to.be.equal(ErrorType.AddedAPINotInOriginalSpec);
    }
  });
});

describe("SpecGenerator", async () => {
  describe("activate", async () => {
    it("should activate and get correct template name", async () => {
      const generator = new SpecGenerator();
      const context = createContext();
      const inputs: Inputs = {
        platform: Platform.CLI,
        projectPath: "./",
        [QuestionNames.Capabilities]: CapabilityOptions.apiPlugin().id,
        [QuestionNames.ApiPluginType]: ApiPluginStartOptions.apiSpec().id,
      };
      let res = await generator.activate(context, inputs);
      let templateName = generator.getTemplateName(inputs);
      assert.isTrue(res);
      assert.equal(templateName, "api-plugin-existing-api");

      delete inputs[QuestionNames.Capabilities];
      inputs[QuestionNames.MeArchitectureType] = MeArchitectureOptions.apiSpec().id;
      res = generator.activate(context, inputs);
      templateName = generator.getTemplateName(inputs);
      assert.isTrue(res);
      assert.equal(templateName, "copilot-plugin-existing-api");

      delete inputs[QuestionNames.MeArchitectureType];
      inputs[QuestionNames.Capabilities] = CapabilityOptions.customCopilotRag().id;
      inputs[QuestionNames.CustomCopilotRag] = CustomCopilotRagOptions.customApi().id;
      res = generator.activate(context, inputs);
      templateName = generator.getTemplateName(inputs);
      assert.isTrue(res);
      assert.equal(templateName, "custom-copilot-rag-custom-api");
    });
  });

  describe("getTempalteInfos", async () => {
    it("happy path", async () => {
      const generator = new SpecGenerator();
      const context = createContext();
      const inputs: Inputs = {
        platform: Platform.CLI,
        projectPath: "./",
        [QuestionNames.Capabilities]: CapabilityOptions.apiPlugin().id,
        [QuestionNames.ApiPluginType]: ApiPluginStartOptions.apiSpec().id,
        [QuestionNames.AppName]: "testapp",
      };
      inputs[QuestionNames.ApiSpecLocation] = "test.yaml";
      inputs.apiAuthData = { serverUrl: "https://test.com", authName: "test", authType: "apiKey" };
      let res = await generator.getTemplateInfos(context, inputs, ".");
      assert.isTrue(res.isOk());
      if (res.isOk()) {
        assert.equal(res.value.length, 1);
      }

      delete inputs[QuestionNames.Capabilities];
      delete inputs.apiAuthData;
      inputs[QuestionNames.MeArchitectureType] = MeArchitectureOptions.apiSpec().id;
      res = await generator.getTemplateInfos(context, inputs, ".");
      assert.isTrue(res.isOk());
      if (res.isOk()) {
        assert.equal(res.value.length, 1);
      }
    });
  });
});
