// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { stemmer } from "./porter2Stemmer";
import * as stopwords from "./stop_words_english.json";

const synonymReplaceRules: Record<string, string> = {
  fetch: "get",
  retriev: "get",
  insert: "add",
  creat: "add",
  updat: "edit",
  modifi: "edit",
  remov: "delet",
};

export function filterStopWords(texts: string[]): string[] {
  return texts.filter((word) => !stopwords.includes(word));
}

export function keepLetters(text: string): string {
  return text.replace(/[^a-zA-Z ]/g, "");
}

export function stemText(texts: string[]): string[] {
  return texts.map(stemmer);
}

export function converseSynonym(text: string): string {
  return text in synonymReplaceRules ? synonymReplaceRules[text] : text;
}

export function stemAndSynonymConvese(texts: string[]): string[] {
  return texts.map(stemmer).map(converseSynonym);
}

export function prepareDiscription(text: string): string[] {
  return stemAndSynonymConvese(
    filterStopWords(
      keepLetters(text)
        .split(" ")
        .filter((word) => word.length > 0)
    )
  );
}
