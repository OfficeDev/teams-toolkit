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
  SystemError,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import "mocha";
import * as sinon from "sinon";
import { Generator } from "../../../src/component/generator/generator";
import { setTools } from "../../../src/core/globalVars";
import { MockTools } from "../../core/utils";
import { SpecParser } from "../../../src/common/spec-parser/specParser";
import { CopilotPluginGenerator } from "../../../src/component/generator/copilotPlugin/generator";
import { assert } from "chai";
import { createContextV3 } from "../../../src/component/utils";
import { ProgrammingLanguage, QuestionNames } from "../../../src/question";
import {
  generateScaffoldingSummary,
  OpenAIPluginManifestHelper,
} from "../../../src/component/generator/copilotPlugin/helper";
import { manifestUtils } from "../../../src/component/driver/teamsApp/utils/ManifestUtils";
import fs from "fs-extra";
import path from "path";
import {
  ErrorType,
  ValidationStatus,
  WarningType,
} from "../../../src/common/spec-parser/interfaces";
import * as specParserUtils from "../../../src/common/spec-parser/utils";
import { getLocalizedString } from "../../../src/common/localizeUtils";
import { SpecParserError } from "../../../src/common/spec-parser/specParserError";

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
    };
    const context = createContextV3();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(specParserUtils, "isYamlSpecFile").resolves(false);
    const generateBasedOnSpec = sandbox.stub(SpecParser.prototype, "generate").resolves();
    const getDefaultVariables = sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
    assert.isTrue(getDefaultVariables.calledOnce);
    assert.isTrue(downloadTemplate.calledOnce);
    assert.isTrue(generateBasedOnSpec.calledOnce);
  });

  it("success with api spec warning", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: ["operation1"],
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
      ],
    });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok({ ...teamsManifest }));
    sandbox.stub(specParserUtils, "isYamlSpecFile").resolves(false);
    sandbox.stub(SpecParser.prototype, "generate").resolves();
    sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
    if (result.isOk()) {
      assert.isTrue(result.value.warnings!.length === 1);
      assert.isFalse(result.value.warnings![0].content.includes("operation2"));
    }
  });

  it("success without api spec warning after filtering", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
      [QuestionNames.ApiSpecLocation]: "https://test.com",
      [QuestionNames.ApiOperation]: ["operation1"],
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
    sandbox.stub(specParserUtils, "isYamlSpecFile").resolves(false);
    sandbox.stub(SpecParser.prototype, "generate").resolves();
    sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

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
    sandbox.stub(specParserUtils, "isYamlSpecFile").resolves(false);
    sandbox.stub(SpecParser.prototype, "generate").resolves();
    sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
  });

  it("success if starting from OpenAI Plugin", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      openAIPluginManifest: openAIPluginManifest,
    };
    const context = createContextV3();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(specParserUtils, "isYamlSpecFile").resolves(true);
    const generateBasedOnSpec = sandbox.stub(SpecParser.prototype, "generate").resolves();
    const getDefaultVariables = sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    const updateManifestBasedOnOpenAIPlugin = sandbox
      .stub(OpenAIPluginManifestHelper, "updateManifest")
      .resolves(ok(undefined));
    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

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
    };
    const context = createContextV3();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(specParserUtils, "isYamlSpecFile").throws(new Error("test"));
    const generateBasedOnSpec = sandbox.stub(SpecParser.prototype, "generate").resolves();
    const getDefaultVariables = sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    const updateManifestBasedOnOpenAIPlugin = sandbox
      .stub(OpenAIPluginManifestHelper, "updateManifest")
      .resolves(err(new SystemError("source", "name", "", "")));
    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

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
    };
    const context = createContextV3();
    sandbox.stub(SpecParser.prototype, "generate").resolves();
    sandbox
      .stub(Generator, "generateTemplate")
      .resolves(err(new SystemError("source", "name", "", "")));

    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

    assert.isTrue(result.isErr());
  });

  it("invalid API spec", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "https://test.com",
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

    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

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
    };
    const context = createContextV3();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox
      .stub(manifestUtils, "_readAppManifest")
      .resolves(err(new SystemError("readManifest", "name", "", "")));
    sandbox.stub(specParserUtils, "isYamlSpecFile").resolves(false);
    sandbox.stub(SpecParser.prototype, "generate").resolves();
    sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

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
    };
    const context = createContextV3();
    sandbox.stub(Generator, "generateTemplate").throws(new Error("test"));

    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

    assert.isTrue(result.isErr());
  });

  it("throws specParser error", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      [QuestionNames.ApiSpecLocation]: "https://test.com",
    };
    const context = createContextV3();
    sandbox
      .stub(SpecParser.prototype, "validate")
      .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(specParserUtils, "isYamlSpecFile").resolves(false);
    sandbox
      .stub(SpecParser.prototype, "generate")
      .throws(new SpecParserError("test", ErrorType.Unknown));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(Generator, "getDefaultVariables").resolves(undefined);

    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

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
      type: "apiBased",
      commands: [
        { id: "command1", type: "query", apiResponseRenderingTemplate: "test", title: "" },
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
      type: "apiBased",
      commands: [{ id: "command1", type: "query", title: "" }],
      supportsConversationalAI: true,
    };
    const res = generateScaffoldingSummary(
      [],
      {
        ...teamsManifest,
        composeExtensions: [composeExtension],
      },
      "path"
    );

    assert.isTrue(res.includes("apiResponseRenderingTemplate"));
  });

  it("warnings about missing adaptive card template", () => {
    const composeExtension: IComposeExtension = {
      type: "apiBased",
      supportsConversationalAI: true,
      commands: [
        { id: "command1", type: "query", apiResponseRenderingTemplate: "test", title: "" },
      ],
    };
    sandbox.stub(fs, "existsSync").returns(false);
    const res = generateScaffoldingSummary(
      [],
      {
        ...teamsManifest,
        composeExtensions: [composeExtension],
      },
      "path"
    );

    assert.isTrue(!res.includes("apiResponseRenderingTemplate"));
    assert.isTrue(res.includes("test"));
  });
});
