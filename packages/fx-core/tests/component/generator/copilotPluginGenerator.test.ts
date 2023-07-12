// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import { err, Inputs, ok, Platform, SystemError } from "@microsoft/teamsfx-api";
import "mocha";
import * as sinon from "sinon";
import { Generator } from "../../../src/component/generator/generator";
import { setTools } from "../../../src/core/globalVars";
import { MockTools } from "../../core/utils";
import { SpecParser } from "../../../src/common/spec-parser/specParser";
import { CopilotPluginGenerator } from "../../../src/component/generator/copilotPlugin/generator";
import { assert } from "chai";
import { createContextV3 } from "../../../src/component/utils";

describe("copilotPluginGenerator", function () {
  const tools = new MockTools();
  setTools(tools);
  const sandbox = sinon.createSandbox();

  this.afterEach(async () => {
    sandbox.restore();
  });

  it("success", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
    };
    const context = createContextV3();
    const generateBasedOnSpec = sandbox.stub(SpecParser.prototype, "generate").resolves();
    const downloadTemplate = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await CopilotPluginGenerator.generate(context, inputs, "projectPath");

    assert.isTrue(result.isOk());
    assert.isTrue(downloadTemplate.calledOnce);
    assert.isTrue(generateBasedOnSpec.calledOnce);
  });

  it("failed to download template generator", async function () {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "path",
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
