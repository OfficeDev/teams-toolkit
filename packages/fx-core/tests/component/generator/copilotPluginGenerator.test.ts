// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import {
  err,
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
import { QuestionNames } from "../../../src/question";
import { OpenAIPluginManifestHelper } from "../../../src/component/generator/copilotPlugin/helper";
import { manifestUtils } from "../../../src/component/driver/teamsApp/utils/ManifestUtils";
import fs from "fs-extra";
import axios from "axios";
import path from "path";

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
    const generateBasedOnSpec = sandbox.stub(SpecParser.prototype, "generate").resolves();
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
    assert.isTrue(downloadTemplate.calledOnce);
    assert.isTrue(generateBasedOnSpec.calledOnce);
  });

  it("success if starting from OpenAI Plugin", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
      openAIPluginManifest: openAIPluginManifest,
    };
    const context = createContextV3();
    const generateBasedOnSpec = sandbox.stub(SpecParser.prototype, "generate").resolves();
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    const updateManifestBasedOnOpenAIPlugin = sandbox
      .stub(OpenAIPluginManifestHelper, "updateManifest")
      .resolves(ok(undefined));
    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
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
    const generateBasedOnSpec = sandbox.stub(SpecParser.prototype, "generate").resolves();
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    const updateManifestBasedOnOpenAIPlugin = sandbox
      .stub(OpenAIPluginManifestHelper, "updateManifest")
      .resolves(err(new SystemError("source", "name", "", "")));
    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

    assert.isTrue(result.isErr());
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
});

describe("OpenAIManifestHelper", async () => {
  const tools = new MockTools();
  setTools(tools);
  const sandbox = sinon.createSandbox();
  const context = createContextV3();

  afterEach(async () => {
    sandbox.restore();
  });

  it("updateManifest: cannot load Teams manifest", async () => {
    sandbox
      .stub(manifestUtils, "_readAppManifest")
      .resolves(err(new SystemError("source", "name", "", "")));
    const result = await OpenAIPluginManifestHelper.updateManifest(
      context,
      openAIPluginManifest,
      "path"
    );
    assert.isTrue(result.isErr());
    if (result.isErr()) {
      assert.equal(result.error.source, "source");
    }
  });

  it("updateManifest: cannot get logo and success", async () => {
    let updatedManifestData = "";
    let updateColor = false;
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(fs, "writeFile").callsFake((file: number | fs.PathLike, data: any) => {
      if (file === path.join("path", "color.png")) {
        updateColor = true;
      } else if (file === path.join("path", "manifest.json")) {
        updatedManifestData = data;
      } else {
        throw new Error("not support " + file);
      }
    });

    sandbox.stub(axios, "get").rejects(new Error("cannot get logo"));
    const result = await OpenAIPluginManifestHelper.updateManifest(
      context,
      openAIPluginManifest,
      "path"
    );
    assert.isTrue(result.isOk());
    assert.isFalse(updateColor);

    const updatedTeamsManifest = JSON.parse(updatedManifestData!) as TeamsAppManifest;
    assert.equal(updatedTeamsManifest!.name.short, "TODO List-${{TEAMSFX_ENV}}");
    assert.equal(updatedTeamsManifest!.name.full, openAIPluginManifest.name_for_model);
    assert.equal(
      updatedTeamsManifest!.description.short,
      openAIPluginManifest.description_for_human
    );
    assert.equal(
      updatedTeamsManifest!.description.full,
      openAIPluginManifest.description_for_model
    );
    assert.equal(updatedTeamsManifest!.developer.privacyUrl, openAIPluginManifest.legal_info_url);
    assert.equal(updatedTeamsManifest!.developer.websiteUrl, openAIPluginManifest.legal_info_url);
    assert.equal(
      updatedTeamsManifest!.developer.termsOfUseUrl,
      openAIPluginManifest.legal_info_url
    );
  });

  it("updateManifest: update logo and success", async () => {
    let updatedManifestData = "";
    let updateColor = false;
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(teamsManifest));
    sandbox.stub(fs, "writeFile").callsFake((file: number | fs.PathLike, data: any) => {
      if (file === path.join("path", "color.png")) {
        updateColor = true;
      } else if (file === path.join("path", "manifest.json")) {
        updatedManifestData = data;
      } else {
        throw new Error("not support " + file);
      }
    });

    sandbox.stub(axios, "get").resolves({ status: 200, data: "data" });
    const result = await OpenAIPluginManifestHelper.updateManifest(
      context,
      openAIPluginManifest,
      "path"
    );
    const updatedTeamsManifest = JSON.parse(updatedManifestData!) as TeamsAppManifest;
    assert.isTrue(result.isOk());
    assert.isTrue(updateColor);
    assert.equal(updatedTeamsManifest!.name.short, "TODO List-${{TEAMSFX_ENV}}");
    assert.equal(updatedTeamsManifest!.name.full, openAIPluginManifest.name_for_model);
    assert.equal(
      updatedTeamsManifest!.description.short,
      openAIPluginManifest.description_for_human
    );
    assert.equal(
      updatedTeamsManifest!.description.full,
      openAIPluginManifest.description_for_model
    );
    assert.equal(updatedTeamsManifest!.developer.privacyUrl, openAIPluginManifest.legal_info_url);
    assert.equal(updatedTeamsManifest!.developer.websiteUrl, openAIPluginManifest.legal_info_url);
    assert.equal(
      updatedTeamsManifest!.developer.termsOfUseUrl,
      openAIPluginManifest.legal_info_url
    );
  });
});
