// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  TikTokenizer,
  createTokenizer,
  getRegexByEncoder,
  getSpecialTokensByEncoder,
} from "@microsoft/tiktokenizer";

import path from "path";

// refer to vscode copilot tokenizer solution
export class Tokenizer {
  public static instance: Tokenizer;
  private _cl100kTokenizer: TikTokenizer | undefined;
  constructor() {}

  public static getInstance(): Tokenizer {
    if (!Tokenizer.instance) {
      Tokenizer.instance = new Tokenizer();
    }

    return Tokenizer.instance;
  }

  private initTokenize(): TikTokenizer {
    return createTokenizer(
      path.join(__dirname, "./cl100k_base.tiktoken"),
      getSpecialTokensByEncoder("cl100k_base"),
      getRegexByEncoder("cl100k_base"),
      64000
    );
  }

  tokenize(content: string): number[] {
    if (!this._cl100kTokenizer) {
      this._cl100kTokenizer = this.initTokenize();
    }

    return this._cl100kTokenizer.encode(content);
  }

  tokenLength(content: string): number {
    if (!content) {
      return 0;
    }
    return this.tokenize(content).length;
  }
}
