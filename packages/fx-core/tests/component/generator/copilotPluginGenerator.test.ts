// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import {
  ApiOperation,
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
  AdaptiveCardGenerator,
  ProjectType,
} from "@microsoft/m365-spec-parser";
import { CopilotPluginGenerator } from "../../../src/component/generator/copilotPlugin/generator";
import { assert, expect } from "chai";
import { createContextV3 } from "../../../src/component/utils";
import { CapabilityOptions, ProgrammingLanguage, QuestionNames } from "../../../src/question";
import {
  generateScaffoldingSummary,
  OpenAIPluginManifestHelper,
  isYamlSpecFile,
  formatValidationErrors,
  listPluginExistingOperations,
} from "../../../src/component/generator/copilotPlugin/helper";
import * as CopilotPluginHelper from "../../../src/component/generator/copilotPlugin/helper";
import { manifestUtils } from "../../../src/component/driver/teamsApp/utils/ManifestUtils";
import fs from "fs-extra";
import { getLocalizedString } from "../../../src/common/localizeUtils";
import { ErrorResult } from "@microsoft/m365-spec-parser";
import { PluginManifestUtils } from "../../../src/component/driver/teamsApp/utils/PluginManifestUtils";
import path from "path";
import { OpenAPIV3 } from "openapi-types";

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

    const result = await CopilotPluginGenerator.generateMeFromApiSpec(
      context,
      inputs,
      "projectPath"
    );

    assert.isTrue(result.isOk());
    assert.isTrue(getDefaultVariables.calledOnce);
    assert.isTrue(downloadTemplate.calledOnce);
    assert.isTrue(generateBasedOnSpec.calledOnce);
    assert.equal(downloadTemplate.args[0][2], "copilot-plugin-existing-api");
  });

  it("success with api key auth", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.AppName]: "test",
      [QuestionNames.ApiSpecLocation]: "test.json",
      [QuestionNames.ApiOperation]: ["operation2"],
      supportedApisFromApiSpec: apiOperations,
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
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generateMeFromApiSpec(
      context,
      inputs,
      "projectPath"
    );

    assert.isTrue(result.isOk());
    assert.equal(downloadTemplate.args[0][2], "copilot-plugin-existing-api-api-key");
    assert.isTrue(downloadTemplate.calledOnce);
    assert.isTrue(generateBasedOnSpec.calledOnce);
  });

  it("API plugin success", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.Capabilities]: CapabilityOptions.copilotPluginApiSpec().id,
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: ["operation1"],
      supportedApisFromApiSpec: apiOperations,
    };
    const context = createContextV3();
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

    const result = await CopilotPluginGenerator.generatePluginFromApiSpec(
      context,
      inputs,
      "projectPath"
    );

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

    const result = await CopilotPluginGenerator.generateMeFromApiSpec(
      context,
      inputs,
      "projectPath"
    );

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

    const result = await CopilotPluginGenerator.generateMeFromApiSpec(
      context,
      inputs,
      "projectPath"
    );

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

    const result = await CopilotPluginGenerator.generateMeFromApiSpec(
      context,
      inputs,
      "projectPath"
    );

    assert.isTrue(result.isOk());
  });

  it("success if starting from OpenAI Plugin", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      openAIPluginManifest: openAIPluginManifest,
      [QuestionNames.ApiOperation]: ["operation1"],
      supportedApisFromApiSpec: apiOperations,
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
      [QuestionNames.ApiOperation]: ["operation1"],
      supportedApisFromApiSpec: apiOperations,
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
      [QuestionNames.ApiSpecLocation]: "test.yml",
      [QuestionNames.ApiOperation]: ["operation1"],
      supportedApisFromApiSpec: apiOperations,
    };
    const context = createContextV3();
    sandbox.stub(SpecParser.prototype, "generate").resolves();
    sandbox
      .stub(Generator, "generateTemplate")
      .resolves(err(new SystemError("source", "name", "", "")));

    const result = await CopilotPluginGenerator.generateMeFromApiSpec(
      context,
      inputs,
      "projectPath"
    );

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
    const context = createContextV3();
    sandbox.stub(SpecParser.prototype, "validate").resolves({
      status: ValidationStatus.Error,
      errors: [{ type: ErrorType.NoServerInformation, content: "" }],
      warnings: [],
    });

    sandbox.stub(SpecParser.prototype, "generate").resolves();
    sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generateMeFromApiSpec(
      context,
      inputs,
      "projectPath"
    );

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

    const result = await CopilotPluginGenerator.generateMeFromApiSpec(
      context,
      inputs,
      "projectPath"
    );

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
      [QuestionNames.ApiOperation]: ["operation1"],
    };
    const context = createContextV3();
    sandbox.stub(Generator, "generateTemplate").throws(new Error("test"));

    const result = await CopilotPluginGenerator.generateMeFromApiSpec(
      context,
      inputs,
      "projectPath"
    );

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

    const result = await CopilotPluginGenerator.generateMeFromApiSpec(
      context,
      inputs,
      "projectPath"
    );

    assert.isTrue(result.isErr());
    if (result.isErr()) {
      assert.equal(result.error.message, "test");
    }
  });

  it("generateForCustomCopilotRagCustomApi: success", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.TS,
      [QuestionNames.ApiSpecLocation]: "test.yaml",
      [QuestionNames.ApiOperation]: ["operation1"],
    };
    const context = createContextV3();
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

    const result = await CopilotPluginGenerator.generateForCustomCopilotRagCustomApi(
      context,
      inputs,
      "projectPath"
    );

    assert.isTrue(result.isOk());
    assert.isTrue(getDefaultVariables.calledOnce);
    assert.isTrue(downloadTemplate.notCalled);
    assert.isTrue(generateBasedOnSpec.calledOnce);
  });

  it("generateForCustomCopilotRagCustomApi: error", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.TS,
      [QuestionNames.ApiSpecLocation]: "test.yaml",
      [QuestionNames.ApiOperation]: ["operation1"],
    };
    const context = createContextV3();
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

    const result = await CopilotPluginGenerator.generateForCustomCopilotRagCustomApi(
      context,
      inputs,
      "projectPath"
    );

    assert.isTrue(result.isErr() && result.error.message === "test");
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

describe("listPluginExistingOperations", () => {
  const teamsManifestWithPlugin: TeamsAppManifest = {
    ...teamsManifest,
    plugins: [
      {
        pluginFile: "resources/plugin.json",
      },
    ],
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
      validAPIs: [
        {
          api: "api1",
          server: "https://test",
          operationId: "get",
          auth: {
            type: "apiKey",
            name: "test",
            in: "header",
          },
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

  it("invalid openapi spec", async () => {
    sandbox
      .stub(PluginManifestUtils.prototype, "getApiSpecFilePathFromTeamsManifest")
      .resolves(ok(["openapi.yaml"]));

    sandbox.stub(SpecParser.prototype, "validate").resolves({
      status: ValidationStatus.Error,
      warnings: [],
      errors: [
        {
          type: ErrorType.NoServerInformation,
          content: "content",
        },
      ],
    });

    let hasException = false;

    try {
      await listPluginExistingOperations(teamsManifestWithPlugin, "manifestPath", "openapi.yaml");
    } catch (e) {
      hasException = true;
      expect(e.source).equal("listPluginExistingOperations");
      expect(e.name).equal("invalid-api-spec");
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
  const context = createContextV3();
  const sandbox = sinon.createSandbox();
  const inputs = {
    "custom-copilot-rag": "custom-copilot-rag-customApi",
    platform: Platform.VSCode,
  };
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
    sandbox.stub(CopilotPluginHelper, "formatValidationErrors").resolves([]);
    sandbox.stub(CopilotPluginHelper, "logValidationResults").resolves();
    sandbox.stub(SpecParser.prototype, "validate").resolves({
      status: ValidationStatus.Valid,
      warnings: [],
      errors: [],
    });
    sandbox
      .stub(SpecParser.prototype, "list")
      .resolves({ validAPIs: [], allAPICount: 1, validAPICount: 0 });

    const res = await CopilotPluginHelper.listOperations(
      context,
      undefined,
      "",
      inputs,
      true,
      false,
      ""
    );
    expect(res.isOk()).to.be.true;
  });
});
