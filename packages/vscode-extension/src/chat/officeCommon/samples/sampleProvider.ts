// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CancellationToken,
  ChatRequest,
  LanguageModelChatMessage,
  LanguageModelChatUserMessage,
} from "vscode";
import { getCopilotResponseAsString } from "../../utils";
import { AddinSampleNode } from "./addInSampleNode";
import { apiSampleData } from "./apiSamples";
import { SampleData } from "./sampleData";
import { scenarioSampleData } from "./scenarioSamples";

export class SampleProvider {
  private rootSample: AddinSampleNode;
  private static instance: SampleProvider;
  private isSampleDataInitialized = false;

  private constructor() {
    // Private constructor to prevent direct instantiation
    this.rootSample = new AddinSampleNode("root");
  }

  public static getInstance(): SampleProvider {
    if (!SampleProvider.instance) {
      SampleProvider.instance = new SampleProvider();
    }
    return SampleProvider.instance;
  }

  public initSampleData() {
    // Load the sample data from the json file
    apiSampleData.samples.forEach((sample) => {
      const namespace = sample.namespace;
      const className = sample.class;
      const name = sample.name;
      const docLink = sample.docLink;
      const code = sample.sample;
      const scenario = sample.scenario;
      const definition = sample.definition;
      const usage = sample.usage;

      this.addSample(
        namespace.toLowerCase(),
        className.toLowerCase(),
        name.toLowerCase(),
        docLink,
        code,
        scenario,
        definition,
        usage
      );
    });

    scenarioSampleData.samples.forEach((sample) => {
      const scenario = sample.scenario;
      const code = sample.sample;
      const name = sample.name;
      const namespace = sample.namespace;
      const definition = sample.definition;
      const usage = sample.usage;

      this.addSample(
        namespace.toLowerCase(),
        "scenarios",
        name,
        "",
        code,
        scenario,
        definition,
        usage
      );
    });

    this.isSampleDataInitialized = true;
  }

  addSample(
    namespace: string,
    className: string,
    name: string,
    docLink: string,
    code: string,
    scenario: string,
    definition: string,
    usage: string
  ) {
    let currentNode: AddinSampleNode = this.rootSample;
    currentNode = currentNode.addNestedSampleNode(namespace);
    currentNode = currentNode.addNestedSampleNode(className);
    currentNode = currentNode.addNestedSampleNode(name);

    currentNode.addSample(name, docLink, code, scenario, definition, usage);
  }

  public getAPISampleCodes(
    namespace: string,
    className: string,
    name: string
  ): SampleData | undefined {
    if (!this.isSampleDataInitialized) {
      this.initSampleData();
    }

    const sampleData = this.rootSample.nestedSampleNode
      .get(namespace.toLowerCase())
      ?.nestedSampleNode.get(className.toLowerCase())
      ?.nestedSampleNode.get(name.toLowerCase())
      ?.getSampleCode();

    return sampleData;
  }

  public async getTopKMostRelevantScenarioSampleCodes(
    request: ChatRequest,
    token: CancellationToken,
    host: string,
    scenario: string,
    k: number
  ): Promise<Map<string, SampleData>> {
    if (!this.isSampleDataInitialized) {
      this.initSampleData();
    }

    const sampleCandidate: Map<string, SampleData> = new Map();

    // Get all the scenarios
    const scenarios: string[] = [];
    const scenarioNode = this.rootSample.nestedSampleNode
      .get(host.toLowerCase())
      ?.nestedSampleNode.get("scenarios");
    scenarioNode?.nestedSampleNode.forEach((scenarioNode) => {
      const sampleData = scenarioNode.getSampleCode();

      if (!!sampleData) {
        scenarios.push(sampleData.scenario);
      }
    });

    if (scenarios.length === 0) {
      return sampleCandidate;
    }

    // Find the most relevant scenarios
    const defaultSystemPrompt = `
    Role:
    You are an expert in Office JavaScript Add-ins, and you are familiar with scenario and the capabilities of Office JavaScript Add-ins.

    Context:
    There're some scenarios listed below, all of them are related to Office JavaScript Add-ins.

    Your task:
    You are asked to find the top ${k} most relevant scenarios for the description: ${scenario}. You need strictly follow the format of output. Nothing else should be included in the output.

    Format of output:
    Return the result in the format of a map, the key of map is "data", the value of "data" is an array, where array item is the scenario. You must pick the scenario from the listed scenarios above. If the result is empty, please return an empty array. If the result is not empty, please return the top ${k} most relevant scenarios. If there are less than ${k} scenarios, return all the scenarios you found. Nothingelse should be included in the output.

    Let’s think step by step
    `;

    // Perform the desired operation
    const messages: LanguageModelChatMessage[] = [
      new LanguageModelChatUserMessage(defaultSystemPrompt),
      new LanguageModelChatUserMessage(request.prompt),
    ];
    const copilotResponse = await getCopilotResponseAsString(
      "copilot-gpt-3.5-turbo",
      messages,
      token
    );

    const mostRelevantScenarios: { data: string[] } = JSON.parse(copilotResponse.trim());
    const scenarioArray = mostRelevantScenarios["data"];

    scenarioArray.forEach((scenario) => {
      scenarioNode?.nestedSampleNode.forEach((scenarioNode) => {
        // TODO:  We're using character-to-character comparison here, which is bad. We should use a more sophisticated comparison algorithm.
        if (scenarioNode.sampleCode && scenarioNode.sampleCode.scenario === scenario) {
          const sampleData = scenarioNode.getSampleCode();

          if (!!sampleData) {
            sampleCandidate.set(sampleData.name, sampleData);
          }
        }
      });
    });

    return sampleCandidate;
  }
}
