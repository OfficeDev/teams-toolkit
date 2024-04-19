// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CancellationToken, LanguageModelChatUserMessage } from "vscode";
import { BM25, BMDocument } from "../../retrievalUtil/BM25";
import { OfficeTemplateModelPorvider, WXPAppName } from "./officeTemplateModelPorvider";
import { SampleData } from "./sampleData";
import { prepareDiscription } from "../../retrievalUtil/retrievalUtil";
import { getCopilotResponseAsString } from "../../../chat/utils";

// TODO: adjust the score threshold
const scoreThreshold = 0.5;

export class SampleProvider {
  private static instance: SampleProvider;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): SampleProvider {
    if (!SampleProvider.instance) {
      SampleProvider.instance = new SampleProvider();
    }
    return SampleProvider.instance;
  }

  public async getTopKMostRelevantScenarioSampleCodesBM25(
    token: CancellationToken,
    host: string,
    scenario: string,
    k: number
  ): Promise<Map<string, SampleData>> {
    const samples: Map<string, SampleData> = new Map<string, SampleData>();
    const bm25: BM25 | null = await OfficeTemplateModelPorvider.getInstance().getBM25Model(
      host as WXPAppName
    );
    if (bm25) {
      const query = prepareDiscription(scenario.toLowerCase());
      const documents: BMDocument[] = bm25.search(query, k);

      for (const doc of documents) {
        if (doc.score >= scoreThreshold && doc.document.metadata) {
          const sampleData = doc.document.metadata as SampleData;
          samples.set(sampleData.name, sampleData);
        }
      }
    }
    return new Promise<Map<string, SampleData>>((resolve, reject) => {
      resolve(samples);
    });
  }

  public async getTopKMostRelevantScenarioSampleCodesLLM(
    token: CancellationToken,
    host: string,
    scenario: string,
    k: number
  ): Promise<Map<string, SampleData>> {
    const sampleDatas = await OfficeTemplateModelPorvider.getInstance().getSamples(
      host as WXPAppName
    );
    const samplesPrompt = `
    # Role:
    You are an expert in Office JavaScript Add-ins, and you are familiar with scenario and the capabilities of Office JavaScript Add-ins. You need to offer the user a suggestion based on the user's ask.
  
    # Context:
    You should give suggestions as an JSON object, and the output must be the JSON object and it will contain the following keys:
    - selectedSampleCodes. value is a string array.
    
    Beyond this JSON object, you should not add anything else to the output. Do not explain, do not provide additional context, do not add any other information to the output.

    # Your tasks:
    For the given function description: '${scenario}', ignore those description of the declaration of the function(name, parameter, return type), focus on the core function intention and summarize that into a short phrase in no more than five words. For each strings listed below, you should also summarize them into a short phrase in no more than five words.
    Using that summarization from given function description, and short phrases from candidate strings below, find strings those short phrase has strong similarity with the summarization. You can pick from 0 up to ${k} strings, and put them into an array of string. If you don't find any relevant strings, you should return an empty array. For the array of string, it should be the value of the key 'selectedSampleCodes' in the return object.

    # The candidate strings:
    ${sampleDatas
      .map((sampleData, index) => (index + 1).toString() + ". " + sampleData.description)
      .join("\n")}

    # The format of output:
    Beyond the JSON object. You should not add anything else to the output.
    The example of output you must to follow: 
    { 
      selectedSampleCodes: ["string1", "string2"] 
    }
    `;
    const samples: Map<string, SampleData> = new Map<string, SampleData>();
    const sampleMessage: LanguageModelChatUserMessage = new LanguageModelChatUserMessage(
      samplesPrompt
    );

    const copilotResponse = await getCopilotResponseAsString(
      "copilot-gpt-4", // "copilot-gpt-3.5-turbo", // "copilot-gpt-4",
      [sampleMessage],
      token
    );

    const returnObject: { selectedSampleCodes: string[] } = JSON.parse(copilotResponse);
    returnObject.selectedSampleCodes.forEach((value: string) => {
      sampleDatas.find((sampleData) => {
        if (sampleData.description.endsWith(value)) {
          samples.set(sampleData.description, sampleData);
          return true;
        }
        return false;
      });
    });

    return new Promise<Map<string, SampleData>>((resolve, reject) => {
      resolve(samples);
    });
  }
}
