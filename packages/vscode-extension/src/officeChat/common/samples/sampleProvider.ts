// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CancellationToken } from "vscode";
import { BM25, BMDocument } from "../../retrievalUtil/BM25";
import { OfficeTemplateModelPorvider, WXPAppName } from "./officeTemplateModelPorvider";
import { SampleData } from "./sampleData";
import { prepareDiscription } from "../../retrievalUtil/retrievalUtil";

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

  public async getTopKMostRelevantScenarioSampleCodes(
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
}
