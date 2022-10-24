import { Inputs, ok, Platform } from "@microsoft/teamsfx-api";
import "mocha";
import * as sinon from "sinon";
import { coordinator } from "../../src/component/coordinator";
import { Generator } from "../../src/component/generator/generator";
import { createContextV3 } from "../../src/component/utils";
import { settingsUtil } from "../../src/component/utils/settingsUtil";
import { setTools } from "../../src/core/globalVars";
import { CoreQuestionNames, ScratchOptionNo, ScratchOptionYes } from "../../src/core/question";
import { MockTools, randomAppName } from "../core/utils";
import { assert } from "chai";
import { TabOptionItem } from "../../src/component/constants";

describe("component coordinator test", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const context = createContextV3();
  afterEach(() => {
    sandbox.restore();
  });

  it("create project from sample", async () => {
    sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ projectId: "mockId", version: "1", isFromSample: false }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNo.id,
      [CoreQuestionNames.Samples]: "hello-world-tab",
    };
    const res = await coordinator.create(context, inputs);
    assert.isTrue(res.isOk());
  });

  it("create project from scratch", async () => {
    sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ projectId: "mockId", version: "1", isFromSample: false }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [CoreQuestionNames.AppName]: randomAppName(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYes.id,
      [CoreQuestionNames.Capabilities]: [TabOptionItem.id],
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
    };
    const res = await coordinator.create(context, inputs);
    assert.isTrue(res.isOk());
  });
});
