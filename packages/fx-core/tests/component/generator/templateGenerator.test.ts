import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import { Inputs, Platform } from "@microsoft/teamsfx-api";
import { createContextV3 } from "../../../src/component/utils";
import path from "path";
import { createSandbox } from "sinon";
import { Generators } from "../../../src/component/generator/generatorProvider";
import { ProgrammingLanguage } from "../../../src/question/create";
import { CapabilityOptions, QuestionNames } from "../../../src/question";
import { MockTools, randomAppName } from "../../core/utils";
import { Generator } from "../../../src/component/generator/generator";
import {
  TemplateNames,
  inputsToTemplateName,
} from "../../../src/component/generator/templates/templateNames";
import { setTools } from "../../../src/core/globalVars";
import { DefaultTemplateGenerator } from "../../../src/component/generator/templates/templateGenerator";
import { TemplateInfo } from "../../../src/component/generator/templates/templateInfo";

describe("TemplateGenerator", () => {
  const testInputsToTemplateName = [
    ...inputsToTemplateName,
    {
      name: TemplateNames.TabSSR,
      inputs: {
        capabilities: CapabilityOptions.nonSsoTab().id,
        [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
        targetFramework: "net8.0",
      },
    },
    {
      name: TemplateNames.SsoTabSSR,
      inputs: {
        capabilities: CapabilityOptions.tab().id,
        [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
        targetFramework: "net8.0",
      },
    },
    {
      name: TemplateNames.Tab,
      inputs: {
        capabilities: CapabilityOptions.nonSsoTab().id,
        [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
        targetFramework: "net6.0",
      },
    },
    {
      name: TemplateNames.SsoTab,
      inputs: {
        capabilities: CapabilityOptions.tab().id,
        [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
        targetFramework: "net6.0",
      },
    },
  ];

  setTools(new MockTools());
  const ctx = createContextV3();
  const destinationPath = path.join(__dirname, "tmp");
  const sandbox = createSandbox();
  let scaffoldingSpy: sinon.SinonSpy;
  let inputs: Inputs;

  beforeEach(() => {
    scaffoldingSpy = sandbox.spy(DefaultTemplateGenerator.prototype, <any>"scaffolding");
    sandbox.stub(Generator, "generate").resolves();
    inputs = {
      platform: Platform.VSCode,
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.JS,
    } as Inputs;
  });

  afterEach(() => {
    sandbox.restore();
  });

  testInputsToTemplateName.forEach(async (pair) => {
    it(`scaffolding ${pair.name}`, async () => {
      inputs = { ...inputs, ...pair.inputs };
      const res = await Generators.find((g) => g.activate(ctx, inputs))?.run(
        ctx,
        inputs,
        destinationPath
      );

      assert.isTrue(res?.isOk());
      assert.isTrue(scaffoldingSpy.calledOnce);
      assert.equal((scaffoldingSpy.args[0][1] as TemplateInfo).templateName, pair.name);
      assert.equal(
        (scaffoldingSpy.args[0][1] as TemplateInfo).language,
        pair.inputs?.[QuestionNames.ProgrammingLanguage] || ProgrammingLanguage.JS
      );
    });
  });
});
