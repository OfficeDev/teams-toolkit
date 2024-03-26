// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CancellationToken,
  ChatRequest,
  LanguageModelChatMessage,
  LanguageModelChatUserMessage,
} from "vscode";
import { SampleData } from "./sampleData";

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
    const samples: Map<string, SampleData> = new Map<string, SampleData>();

    return new Promise<Map<string, SampleData>>((resolve, reject) => {
      resolve(samples);
    });
  }
}
