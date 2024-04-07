// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { prepareDiscription } from "./ragUtil";

export type DocumentMetadata = {
  description: string;
  codeSample: string;
};

export type API = {
  name: string;
  description: string;
  kind: string;
  signature: string;
  examples: string[];
};

// for new json array templates
export function prepareExamples(
  docs: DocumentMetadata[]
): [string[], Map<string, DocumentMetadata>] {
  const docsWithMetadata: Map<string, DocumentMetadata> = new Map();
  const cleanDocs: string[] = [];
  docs.forEach((doc) => {
    const cleanDescription = prepareDiscription(doc.description).join(" ");
    cleanDocs.push(cleanDescription);
    docsWithMetadata.set(cleanDescription, doc);
  });
  return [cleanDocs, docsWithMetadata];
}
