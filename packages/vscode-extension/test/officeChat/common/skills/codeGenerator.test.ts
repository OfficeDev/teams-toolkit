import * as chai from "chai";
import sinon from "ts-sinon";
import { Spec } from "../../../../src/officeChat/common/skills/spec";
import { CancellationToken, ChatResponseStream, LanguageModelChatUserMessage } from "vscode";
import * as utils from "../../../../src/chat/utils";
import { ExecutionResultEnum } from "../../../../src/officeChat/common/skills/executionResultEnum";
import { Printer } from "../../../../src/officeChat/common/skills/printer";
import { CodeGenerator } from "../../../../src/officeChat/common/skills/codeGenerator";
import { SampleProvider } from "../../../../src/officeChat/common/samples/sampleProvider";
import { SampleData } from "../../../../src/officeChat/common/samples/sampleData";

describe("codeGenerator", () => {
  let invokeParametersInit: () => any;
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    invokeParametersInit = function () {
      const spec = new Spec("some user input");
      spec.taskSummary = "some task summary";
      spec.sections = ["section1", "section2"];
      spec.resources = ["resource1", "resource2"];
      spec.appendix = {
        host: "some host",
        codeSnippet: "some code",
        codeExplanation: "some explanation",
        codeTaskBreakdown: ["task1", "task2"],
        isCustomFunction: false,
        telemetryData: {
          properties: { property1: "value1", property2: "value2" },
          measurements: { measurement1: 1, measurement2: 2 },
        },
        complexity: 0,
      };

      const model: LanguageModelChatUserMessage = {
        content: "",
        name: undefined,
      };

      const fakeResponse: ChatResponseStream = {
        markdown: sandbox.stub(),
        anchor: sandbox.stub(),
        button: sandbox.stub(),
        filetree: sandbox.stub(),
        progress: sandbox.stub(),
        reference: sandbox.stub(),
        push: sandbox.stub(),
      };

      const fakeToken: CancellationToken = {
        isCancellationRequested: false,
        onCancellationRequested: sandbox.stub(),
      };

      return { spec, model, fakeResponse, fakeToken };
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("constructor", () => {
    const codeGenerator = new CodeGenerator();

    chai.assert.isNotNull(codeGenerator);
    chai.assert.equal(codeGenerator.name, "Code Generator");
    chai.assert.equal(codeGenerator.capability, "Generate code");
  });

  it("canInvoke returns true", () => {
    const codeGenerator = new CodeGenerator();
    const spec = new Spec("Some user input");
    spec.taskSummary = "Some task summary";
    spec.sections = ["section1", "section2"];
    spec.inspires = ["inspire1", "inspire2"];
    spec.resources = ["resource1", "resource2"];
    spec.appendix = {
      host: "Some host",
      codeSnippet: "Some code snippet",
      codeExplanation: "Some code explanation",
      codeTaskBreakdown: ["task1", "task2"],
      isCustomFunction: true,
      telemetryData: {
        properties: {
          property1: "value1",
          property2: "value2",
        },
        measurements: {
          measurement1: 1,
          measurement2: 2,
        },
      },
      complexity: 3,
    };

    const result = codeGenerator.canInvoke(spec);
    chai.assert.isTrue(result);
  });

  it("userInputBreakdownTaskAsync returns null", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const codeGenerator = new CodeGenerator();

    sandbox.stub(utils, "getCopilotResponseAsString").resolves(undefined);

    const result = await codeGenerator.userInputBreakdownTaskAsync(spec, fakeToken);

    chai.expect(result).to.equal(null);
  });

  it("userInputBreakdownTaskAsync returns null with error", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const codeGenerator = new CodeGenerator();

    const getCopilotResponseAsStringStub = sandbox
      .stub(utils, "getCopilotResponseAsString")
      .resolves("not valid JSON");

    const result = await codeGenerator.userInputBreakdownTaskAsync(spec, fakeToken);

    chai.expect(result).to.equal(null);
  });

  it("userInputBreakdownTaskAsync with LLM provided json should not continue, json detected", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const codeGenerator = new CodeGenerator();

    sandbox.stub(console, "log");

    const getCopilotResponseStub = sandbox.stub(utils, "getCopilotResponseAsString");
    getCopilotResponseStub.resolves(
      JSON.stringify({
        host: "fakeHost",
        shouldContinue: false,
        customFunctions: true,
        complexity: 1,
        data: ["fakeData1", "fakeData2"],
      })
    );
    const jsonParseStub = sandbox.stub(JSON, "parse");
    const parserResult = {
      host: "fakeHost",
      shouldContinue: false,
      customFunctions: true,
      complexity: 1,
      data: ["fakeData1", "fakeData2"],
    };
    jsonParseStub.returns(parserResult);

    const result = await codeGenerator.userInputBreakdownTaskAsync(spec, fakeToken);

    chai.expect(result).to.equal(parserResult);
  });

  it("userInputBreakdownTaskAsync with LLM provided json should not continue, json detected_", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const codeGenerator = new CodeGenerator();

    sandbox.stub(console, "log");

    const getCopilotResponseStub = sandbox.stub(utils, "getCopilotResponseAsString");
    getCopilotResponseStub.resolves(
      '```json\n{"host": "fakeHost", "shouldContinue": false, "customFunctions": true, "complexity": 1, "data": ["fakeData1", "fakeData2"]}\n```'
    );
    const jsonParseStub = sandbox.stub(JSON, "parse");
    const parserResult = {
      host: "fakeHost",
      shouldContinue: false,
      customFunctions: true,
      complexity: 1,
      data: ["fakeData1", "fakeData2"],
    };
    jsonParseStub.returns(parserResult);

    const result = await codeGenerator.userInputBreakdownTaskAsync(spec, fakeToken);

    chai.expect(result).to.equal(parserResult);
  });

  it("userInputBreakdownTaskAsync with LLM provided json should not continue, json not detected", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const codeGenerator = new CodeGenerator();

    sandbox.stub(console, "log");

    const getCopilotResponseStub = sandbox.stub(utils, "getCopilotResponseAsString");
    getCopilotResponseStub.resolves("some random string that is not a JSON object");
    const jsonParseStub = sandbox.stub(JSON, "parse");
    const jsonParseResult = {
      host: "fakeHost",
      shouldContinue: false,
      customFunctions: true,
      complexity: 1,
      data: ["fakeData1", "fakeData2"],
    };
    jsonParseStub.returns(jsonParseResult);

    const result = await codeGenerator.userInputBreakdownTaskAsync(spec, fakeToken);

    chai.expect(result).to.equal(jsonParseResult);
  });

  it("userInputBreakdownTaskAsync with LLM provided json should not continue, error", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const codeGenerator = new CodeGenerator();

    sandbox.stub(console, "log");

    const getCopilotResponseStub = sandbox.stub(utils, "getCopilotResponseAsString");
    getCopilotResponseStub.resolves("some random string that is not a JSON object");

    const result = await codeGenerator.userInputBreakdownTaskAsync(spec, fakeToken);

    chai.expect(result).to.equal(null);
  });

  it("userInputBreakdownTaskAsync with LLM provided json should continue, is not customFunctions", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const codeGenerator = new CodeGenerator();

    sandbox.stub(console, "log");

    const getCopilotResponseStub = sandbox.stub(utils, "getCopilotResponseAsString");
    getCopilotResponseStub.resolves("some random string that is not a JSON object");
    const jsonParseStub = sandbox.stub(JSON, "parse");
    const jsonParseResult = {
      host: "fakeHost",
      shouldContinue: true,
      customFunctions: false,
      complexity: 1,
      data: ["fakeData1", "fakeData2"],
    };
    jsonParseStub.returns(jsonParseResult);

    const result = await codeGenerator.userInputBreakdownTaskAsync(spec, fakeToken);

    jsonParseResult.data.push(
      "Create an entry function named 'main'. This function doesn't take any parameters and will call other functions in the list in right order. The function should be declared as 'async function'."
    );

    chai.expect(result).to.equal(jsonParseResult);
  });

  it("userInputBreakdownTaskAsync with LLM provided json should continue, is customFunctions", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const codeGenerator = new CodeGenerator();

    sandbox.stub(console, "log");

    const getCopilotResponseStub = sandbox.stub(utils, "getCopilotResponseAsString");
    getCopilotResponseStub.resolves(
      '```json\n{"host": "fakeHost", "shouldContinue": false, "customFunctions": true, "complexity": 1, "data": ["fakeData1", "entry function named \'main\'"]}\n```'
    );
    const jsonParseStub = sandbox.stub(JSON, "parse");
    const jsonParseResult = {
      host: "fakeHost",
      shouldContinue: true,
      customFunctions: true,
      complexity: 1,
      data: ["fakeData1", "fakeData2", "entry function named 'main'"],
    };
    jsonParseStub.returns(jsonParseResult);

    const result = await codeGenerator.userInputBreakdownTaskAsync(spec, fakeToken);

    jsonParseResult.data.filter((task: string) => {
      return !task.includes("entry function named 'main'");
    });

    chai.expect(result).to.equal(jsonParseResult);
  });

  it("generateCode - Excel - isCustomFunctions", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const host = "Excel";
    const suggestedFunction = ["function1", "function2"];
    const isCustomFunctions = true;
    const codeGenerator = new CodeGenerator();
    sandbox.stub(console, "log");
    sandbox.stub(console, "debug");
    const getCopilotResponseAsStringStub = sandbox.stub(utils, "getCopilotResponseAsString");
    getCopilotResponseAsStringStub.returns(Promise.resolve("```typescript\n// Some code\n```"));
    const getTopKMostRelevantScenarioSampleCodesStub = sandbox.stub(
      SampleProvider.prototype,
      "getTopKMostRelevantScenarioSampleCodesLLM"
    );

    const scenarioSamples = new Map<string, SampleData>();
    getTopKMostRelevantScenarioSampleCodesStub.returns(Promise.resolve(scenarioSamples));

    // Act
    const result = await codeGenerator.generateCode(
      fakeToken,
      host,
      isCustomFunctions,
      suggestedFunction,
      spec
    );

    // Assert
    chai.expect(result).to.exist; // Replace with more specific assertions
  });

  it("generateCode - Excel - not CustomFunctions", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const host = "Excel";
    const suggestedFunction = ["function1", "function2"];
    const isCustomFunctions = false;
    const codeGenerator = new CodeGenerator();
    sandbox.stub(console, "log");
    sandbox.stub(console, "debug");
    const getCopilotResponseAsStringStub = sandbox.stub(utils, "getCopilotResponseAsString");
    getCopilotResponseAsStringStub.returns(Promise.resolve("```typescript\n// Some code\n```"));
    const getTopKMostRelevantScenarioSampleCodesStub = sandbox.stub(
      SampleProvider.prototype,
      "getTopKMostRelevantScenarioSampleCodesLLM"
    );
    const scenarioSamples = new Map<string, SampleData>();
    getTopKMostRelevantScenarioSampleCodesStub.returns(Promise.resolve(scenarioSamples));

    // Act
    const result = await codeGenerator.generateCode(
      fakeToken,
      host,
      isCustomFunctions,
      suggestedFunction,
      spec
    );

    // Assert
    chai.expect(result).to.exist; // Replace with more specific assertions
  });

  it("generateCode - not Excel - isCustomFunctions", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const host = "Word";
    const suggestedFunction = ["function1", "function2"];
    const isCustomFunctions = true;
    const codeGenerator = new CodeGenerator();
    sandbox.stub(console, "log");
    sandbox.stub(console, "debug");
    const getCopilotResponseAsStringStub = sandbox.stub(utils, "getCopilotResponseAsString");
    getCopilotResponseAsStringStub.returns(Promise.resolve("```typescript\n// Some code\n```"));
    const getTopKMostRelevantScenarioSampleCodesStub = sandbox.stub(
      SampleProvider.prototype,
      "getTopKMostRelevantScenarioSampleCodesLLM"
    );
    const scenarioSamples = new Map<string, SampleData>();
    getTopKMostRelevantScenarioSampleCodesStub.returns(Promise.resolve(scenarioSamples));

    // Act
    const result = await codeGenerator.generateCode(
      fakeToken,
      host,
      isCustomFunctions,
      suggestedFunction,
      spec
    );

    // Assert
    chai.expect(result).to.exist; // Replace with more specific assertions
  });

  it("generateCode - Excel - isCustomFunctions - valid scenarioSample", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const host = "Excel";
    const suggestedFunction = ["function1", "function2"];
    const isCustomFunctions = true;
    const codeGenerator = new CodeGenerator();
    sandbox.stub(console, "log");
    sandbox.stub(console, "debug");
    const getCopilotResponseAsStringStub = sandbox.stub(utils, "getCopilotResponseAsString");
    getCopilotResponseAsStringStub.returns(Promise.resolve("```typescript\n// Some code\n```"));

    const getTopKMostRelevantScenarioSampleCodesStub = sandbox.stub(
      SampleProvider.prototype,
      "getTopKMostRelevantScenarioSampleCodesLLM"
    );

    const scenarioSamples = new Map<string, SampleData>();
    scenarioSamples.set(
      "sample1",
      new SampleData(
        "Sample Name",
        "https://docs.example.com",
        'const example = "Hello, world!";',
        "This is a sample description.",
        "This is a sample definition.",
        "This is a sample usage."
      )
    );
    scenarioSamples.set(
      "sample2",
      new SampleData(
        "Sample Name",
        "https://docs.example.com",
        'const example = "Hi, world!";',
        "This is a sample description.",
        "This is a sample definition.",
        "This is a sample usage."
      )
    );

    getTopKMostRelevantScenarioSampleCodesStub.returns(Promise.resolve(scenarioSamples));

    // Act
    const result = await codeGenerator.generateCode(
      fakeToken,
      host,
      isCustomFunctions,
      suggestedFunction,
      spec
    );

    // Assert
    chai.expect(result).to.exist; // Replace with more specific assertions
  });

  it("generateCode - Excel - isCustomFunctions - return null", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const host = "Excel";
    const suggestedFunction = ["function1", "function2"];
    const isCustomFunctions = true;
    const codeGenerator = new CodeGenerator();
    sandbox.stub(console, "log");
    sandbox.stub(console, "debug");
    sandbox.stub(console, "error");
    const getCopilotResponseAsStringStub = sandbox.stub(utils, "getCopilotResponseAsString");
    getCopilotResponseAsStringStub.returns(Promise.resolve("..."));
    const getTopKMostRelevantScenarioSampleCodesStub = sandbox.stub(
      SampleProvider.prototype,
      "getTopKMostRelevantScenarioSampleCodesLLM"
    );
    const scenarioSamples = new Map<string, SampleData>();
    getTopKMostRelevantScenarioSampleCodesStub.returns(Promise.resolve(scenarioSamples));

    // Act
    const result = await codeGenerator.generateCode(
      fakeToken,
      host,
      isCustomFunctions,
      suggestedFunction,
      spec
    );

    // Assert
    chai.expect(result).to.equal(null); // Replace with more specific assertions
  });

  it("Invoke Failure because no breakdownResult", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const codeGenerator = new CodeGenerator();
    sandbox.stub(console, "log");
    sandbox.stub(console, "debug");

    sandbox.stub(codeGenerator, "userInputBreakdownTaskAsync").resolves(null);
    const result = codeGenerator.invoke(model, fakeResponse, fakeToken, spec);
    chai.expect((await result).result).to.equal(ExecutionResultEnum.Failure);
  });

  it("Invoke Rejected", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const codeGenerator = new CodeGenerator();
    sandbox.stub(console, "log");
    sandbox.stub(console, "debug");

    sandbox.stub(codeGenerator, "userInputBreakdownTaskAsync").resolves({
      host: "some host",
      shouldContinue: false,
      customFunctions: false,
      data: ["some data"],
      complexity: 5,
    });

    const result = codeGenerator.invoke(model, fakeResponse, fakeToken, spec);
    chai.expect((await result).result).to.equal(ExecutionResultEnum.Rejected);
  });

  it("Invoke Failure", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const codeGenerator = new CodeGenerator();
    sandbox.stub(console, "log");
    sandbox.stub(console, "debug");

    sandbox.stub(codeGenerator, "userInputBreakdownTaskAsync").resolves({
      host: "some host",
      shouldContinue: true,
      customFunctions: false,
      data: ["some data"],
      complexity: 5,
    });
    sandbox.stub(codeGenerator, "generateCode").resolves(null);

    const result = codeGenerator.invoke(model, fakeResponse, fakeToken, spec);

    chai.expect((await result).result).to.equal(ExecutionResultEnum.Failure);
  });

  it("Invoke Success", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const codeGenerator = new CodeGenerator();
    sandbox.stub(console, "log");
    sandbox.stub(console, "debug");

    sandbox.stub(codeGenerator, "userInputBreakdownTaskAsync").resolves({
      host: "some host",
      shouldContinue: true,
      customFunctions: false,
      data: ["some data"],
      complexity: 5,
    });
    sandbox.stub(codeGenerator, "generateCode").resolves("Some code");

    const result = codeGenerator.invoke(model, fakeResponse, fakeToken, spec);

    chai.expect((await result).result).to.equal(ExecutionResultEnum.Success);
  });

  it("Invoke Success with complexity > 50", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    spec.appendix.complexity = 51;
    const codeGenerator = new CodeGenerator();
    sandbox.stub(console, "log");
    sandbox.stub(console, "debug");

    sandbox.stub(codeGenerator, "userInputBreakdownTaskAsync").resolves({
      host: "some host",
      shouldContinue: true,
      customFunctions: false,
      data: ["some data"],
      complexity: 51,
    });
    sandbox.stub(codeGenerator, "generateCode").resolves("Some code");

    const result = codeGenerator.invoke(model, fakeResponse, fakeToken, spec);

    chai.expect((await result).result).to.equal(ExecutionResultEnum.Success);
  });

  it("Invoke Success with MeasurementCodeGenExecutionTimeInTotalSec", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const codeGenerator = new CodeGenerator();
    sandbox.stub(console, "log");
    sandbox.stub(console, "debug");
    spec.appendix.telemetryData.measurements["CodeGenExecutionTimeInTotalSec"] = 1;

    sandbox.stub(codeGenerator, "userInputBreakdownTaskAsync").resolves({
      host: "some host",
      shouldContinue: true,
      customFunctions: false,
      data: ["some data"],
      complexity: 5,
    });
    sandbox.stub(codeGenerator, "generateCode").resolves("Some code");

    const result = codeGenerator.invoke(model, fakeResponse, fakeToken, spec);

    chai.expect((await result).result).to.equal(ExecutionResultEnum.Success);
  });
});
