// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CancellationToken, LanguageModelChatUserMessage } from "vscode";
import { BM25, BMDocument } from "../../retrievalUtil/BM25";
import { OfficeTemplateModelPorvider, WXPAppName } from "./officeTemplateModelPorvider";
import { SampleData } from "./sampleData";
import { prepareDiscription } from "../../retrievalUtil/retrievalUtil";
import { countMessagesTokens, getCopilotResponseAsString } from "../../../chat/utils";
import {
  getMostRelevantClassPrompt,
  getMostRelevantMethodPropertyPrompt,
} from "../../officePrompts";
import { DeclarationFinder } from "../declarationFinder";
import { getTokenLimitation } from "../../consts";

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

  public async getMostRelevantDeclarationsUsingLLM(
    token: CancellationToken,
    host: string,
    codeSpec: string,
    sample: string
  ): Promise<Map<string, SampleData>> {
    const pickedDeclarations: Map<string, SampleData> = new Map<string, SampleData>();

    const t1 = performance.now();
    const classSummaries = await DeclarationFinder.getInstance().getClassSummariesForHost(host);
    if (classSummaries.length === 0) {
      return pickedDeclarations;
    }
    let sampleMessage: LanguageModelChatUserMessage = new LanguageModelChatUserMessage(
      getMostRelevantClassPrompt(codeSpec, classSummaries, sample)
    );

    let copilotResponse = await getCopilotResponseAsString(
      "copilot-gpt-3.5-turbo", // "copilot-gpt-3.5-turbo", // "copilot-gpt-4",
      [sampleMessage],
      token
    );

    let returnObject: { picked: string[] } = JSON.parse(copilotResponse);
    if (returnObject.picked.length === 0) {
      return pickedDeclarations;
    }
    const classNames: string[] = returnObject.picked.map((value) => value.replace("- ", "").trim());

    if (classNames.length === 0) {
      return pickedDeclarations;
    }

    const t2 = performance.now();
    const classDeclarationPairs: [string, SampleData[]][] = [];
    for (const className of classNames) {
      const methodsOrProperties =
        await DeclarationFinder.getInstance().getMethodsOrPropertiesForClass(host, className);
      classDeclarationPairs.push([className, methodsOrProperties]);
    }

    while (classDeclarationPairs.length > 0) {
      let msgCount = 0;
      let classNamesList: string[] = [];
      const classNamesListTemp: string[] = [];
      let methodsOrProperties: SampleData[] = [];
      const methodsOrPropertiesTemp: SampleData[] = [];
      let getMoreRelevantMethodsOrPropertiesPrompt = "";
      while (msgCount < getTokenLimitation("copilot-gpt-3.5-turbo")) {
        const candidate = classDeclarationPairs.pop();
        if (!candidate) {
          break;
        }
        classNamesList = classNamesListTemp.map((value) => value);
        classNamesListTemp.unshift(candidate[0]);
        methodsOrProperties = methodsOrPropertiesTemp.map((value) => value);
        methodsOrPropertiesTemp.unshift(...candidate[1]);
        // group the methods or properties by class name
        const groupedMethodsOrProperties: Map<string, SampleData[]> = new Map<
          string,
          SampleData[]
        >();
        for (const methodOrProperty of methodsOrPropertiesTemp) {
          if (!groupedMethodsOrProperties.has(methodOrProperty.definition)) {
            groupedMethodsOrProperties.set(methodOrProperty.definition, []);
          }
          groupedMethodsOrProperties.get(methodOrProperty.definition)?.push(methodOrProperty);
        }
        getMoreRelevantMethodsOrPropertiesPrompt = getMostRelevantMethodPropertyPrompt(
          codeSpec,
          classNamesList,
          groupedMethodsOrProperties,
          sample
        );
        sampleMessage = new LanguageModelChatUserMessage(getMoreRelevantMethodsOrPropertiesPrompt);
        msgCount = countMessagesTokens([sampleMessage]);
      }
      if (methodsOrProperties.length === 0) {
        // For class that has huge amount of methods or properties, we have to skip it.
        continue;
      }
      // group the methods or properties by class name
      const groupedMethodsOrProperties: Map<string, SampleData[]> = new Map<string, SampleData[]>();
      for (const methodOrProperty of methodsOrProperties) {
        if (!groupedMethodsOrProperties.has(methodOrProperty.definition)) {
          groupedMethodsOrProperties.set(methodOrProperty.definition, []);
        }
        groupedMethodsOrProperties.get(methodOrProperty.definition)?.push(methodOrProperty);
      }

      getMoreRelevantMethodsOrPropertiesPrompt = getMostRelevantMethodPropertyPrompt(
        codeSpec,
        classNamesList,
        groupedMethodsOrProperties,
        sample
      );
      sampleMessage = new LanguageModelChatUserMessage(getMoreRelevantMethodsOrPropertiesPrompt);
      copilotResponse = await getCopilotResponseAsString(
        "copilot-gpt-3.5-turbo", // "copilot-gpt-3.5-turbo", // "copilot-gpt-4",
        [sampleMessage],
        token
      );

      try {
        returnObject = JSON.parse(copilotResponse);
      } catch (error) {
        console.log(copilotResponse);
      }

      returnObject.picked.forEach((value: string) => {
        const sampleData = methodsOrProperties.find(
          (sample) =>
            value.trim() == sample.codeSample.trim() ||
            value.trim().endsWith(sample.codeSample.trim()) ||
            sample.codeSample.trim().endsWith(value.trim()) ||
            value.trim().indexOf(sample.codeSample.trim()) >= 0 ||
            sample.codeSample.trim().indexOf(value.trim()) >= 0
        );
        if (sampleData) {
          pickedDeclarations.set(sampleData.description, sampleData);
        }
      });
    }

    const t3 = performance.now();
    console.log(
      `Pick relevant classes: ${(t2 - t1) / 1000} seconds, get methods/properties: ${
        (t3 - t2) / 1000
      }.`
    );
    return new Promise<Map<string, SampleData>>((resolve, reject) => {
      resolve(pickedDeclarations);
    });
  }
}
