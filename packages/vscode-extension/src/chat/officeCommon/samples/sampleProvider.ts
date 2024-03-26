// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CancellationToken,
  ChatRequest,
  LanguageModelChatMessage,
  LanguageModelChatUserMessage,
} from "vscode";
import { OfficeAddinSampleDownloader, WXPAppName } from "./officeAddinSampleDownloader";
import { SampleData } from "./sampleData";
import { prepareExamples, searchTopKByqueryAndDocs } from "../../rag/rag";

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

  public async getTopKMostRelevantScenarioSampleCodes(
    request: ChatRequest,
    token: CancellationToken,
    host: string,
    scenario: string,
    k: number
  ): Promise<Map<string, SampleData>> {
    const sampleCollection: SampleData[] =
      await OfficeAddinSampleDownloader.getInstance().getSamples(host as WXPAppName);
    const [cleanDocs, docsWithMetadata] = prepareExamples(sampleCollection);
    // Todo: adjust the threshold
    const matchedDocs = searchTopKByqueryAndDocs(
      scenario,
      cleanDocs,
      docsWithMetadata,
      k,
      0.8 /*threshold*/
    );

    const samples: Map<string, SampleData> = new Map<string, SampleData>();
    for (const sampleData of matchedDocs as SampleData[]) {
      samples.set(sampleData.name, sampleData);
    }

    return new Promise<Map<string, SampleData>>((resolve, reject) => {
      resolve(samples);
    });
  }
}
