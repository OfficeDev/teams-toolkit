//import { SearchEngine } from 'clientside-search';
//import { get_encoding } from "tiktoken";
//import { parseCopilotResponseMaybeWithStrJson } from '../copilotInteractions.js';
import { excelJsApiDocs } from "./Excel_ObjsWithAPIs";
import { BM25, BMDocument, prepareDiscription } from "./ragUtil";
import { wordJsApiDocs } from './word_docs';
//import en from 'clientside-search'
//import { pipeline } from '@xenova/transformers';

//export function tokenize(text: string) {
//  const enc = get_encoding("cl100k_base");
//  return enc.encode(text);
//}

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
}

//descrepted, only for wordJsApiDocs formatting
export function prepareDocs(): [string[], Map<string, API>] {
  let docs: string[] = [];
  let docsWithMetadata: Map<string, API> = new Map();
  excelJsApiDocs.forEach((object) => {
    object.apiList.forEach((api) => {
      if (api.description === undefined) {
        return;
      }
      let cleanDescription = prepareDiscription(api.description).join(" ");
      docs.push(cleanDescription);
      docsWithMetadata.set(cleanDescription, api);
    });
  });
  return [docs, docsWithMetadata];
}

// for new json array templates
export function prepareExamples(docs: DocumentMetadata[]): [string[], Map<string, DocumentMetadata>] {
  let docsWithMetadata: Map<string, DocumentMetadata> = new Map();
  let cleanDocs: string[] = [];
  docs.forEach((doc) => {
    let cleanDescription = prepareDiscription(doc.description).join(" ");
    cleanDocs.push(cleanDescription);
    docsWithMetadata.set(cleanDescription, doc);
  });
  return [cleanDocs, docsWithMetadata];
}

//export function getStepsByResponse(response: string): string[] {
//  let steps: string[] = [];
//  const responseJson = parseCopilotResponseMaybeWithStrJson(response);
//  if (responseJson && responseJson.response) {
//    if (Array.isArray(responseJson.response)) {
//      responseJson.response.forEach((element: any) => {
//        if (element.type === "init_plan") {
//          steps = element.content.split(/\d\.\s*/).filter((step) => step !== "");
//        }
//      });
//    }
//  }
//  return steps;
//}

function splitStep(step: string): string[] {
  return step.replace(/[^a-zA-Z0-9 ]/g, "").toLowerCase().split(" ");
}

export function searchTopKBySteps(steps: string[], topK: number = 3): API[] {
  let [docs, docsWithMetadata] = prepareDocs();
  let matchedAPIs: Set<string> = new Set();
  steps.forEach((step) => {
    const results = BM25(
      docs,
      prepareDiscription(step),
      undefined,
      (firstEl, secondEl) => {
        return secondEl.score - firstEl.score;
      }
    ) as BMDocument[];

    // first only take the topK results
    results.slice(0, topK < results.length ? topK : results.length).forEach((result) => {
      if (result.score > 2) {
        matchedAPIs.add(result.document);
      }
    });
  });
  let apiSample: API[] = Array.from(matchedAPIs).map((api) => docsWithMetadata.get(api)).filter((api) => api !== undefined) as API[];
  return apiSample;
}

export function searchTopKByqueryAndDocs(query: string, docsObjects: DocumentMetadata[], topK: number = 2, scoreThreshold: number = 2): DocumentMetadata[] {
  let [docs, docsWithMetadata] = prepareExamples(docsObjects);
  let results = BM25(
    docs,
    prepareDiscription(query),
    undefined,
    (firstEl, secondEl) => {
      return secondEl.score - firstEl.score;
    }
  ) as BMDocument[];
  let matchedDocs: DocumentMetadata[] = [];
  results.slice(0, topK < results.length ? topK : results.length).forEach((result) => {
    if (result.score >= scoreThreshold) {
      matchedDocs.push(docsWithMetadata.get(result.document) as DocumentMetadata);
    }
  });
  return matchedDocs;
}

// for your information


//export async function embeddingHelloWorld() {
//  let mod = await import('@xenova/transformers')
//  const extractor = await mod.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
//
//  // Compute sentence embeddings
//  const sentences = ['This is an example sentence', 'Each sentence is converted'];
//  const output = await extractor(sentences, { pooling: 'mean', normalize: true });
//  console.log(output);
//}

//export function initSearchEngine() {
//  const searchEngine = new SearchEngine(en)
//  wordJsApiDocs.forEach((object) => {
//    object.apiList.forEach((api) => {
//      searchEngine.addDocument(api.description, { apiDef: api });
//    });
//  });
//  return searchEngine;
//}
//
//export function searchDocs(searchEngine: SearchEngine, query: string, topN?: number | undefined) {
//  return searchEngine.search(query, topN);
//}

//export const plannerResponseSchema = `{
//  "response": [
//    {
//      "type": "init_plan",
//      "content": "1. the first step in the plan\n 2. the second step in the plan\n 3. the third step in the plan"
//    },
//    {
//      "type": "host",
//      "content": "Word"
//    }
//  ]
//}`;
//
//export const instructionTemplates = `You are the Planner and expert in Office JavaScript Add-in area to help finish the user task.
//## User Character
//- The User's input should be the request or additional information to automate a certain process or accomplish a certain task using Office JavaScript APIs.
//- The user is asking for a code snippet or function that can be used to accomplish the task.
//- The input of the User will prefix with "User:" in the chat history.
//
//## Planner Character
//- Planner is an expert in Office JavaScript Add-ins, and you are familiar with scenario and the capabilities of Office JavaScript Add-ins and APIs.
//- Planner should try the best to plan the subtasks related with Office JavaScript Add-ins.
//- Planner's role is to plan the subtasks to resolve the request from the User.
//
//## Planner's response format
//- Planner must strictly format the response into the following JSON object:
//  ${plannerResponseSchema}
//- Planner's response must always include the 2 types of elements "init_plan", "host".
//  - "init_plan" is the initial plan that Planner provides to the User.
//  - "host" is the platform to indicate which Office application is the most relvevant to the user's ask in "init_plan". You can only pick from "Excel", "Word", "PowerPoint".
//- Planner must not include any other types of elements in the response that can cause parsing errors.
//
//# About planning
//You need to make a step-by-step plan to complete the User's task. The planning process includes 2 phases:
//
//## Initial planning
//  - Decompose User's task into subtasks and list them as the detailed plan steps.
//  - Only consider the tasks that can be handled by Office JavaScript APIs.
//  - Do not include any tasks of opening applications.
//
//## Office Javascripot Api Host Detection
//  - Determine which Office application is the most relvevant to the user's ask.
//`;

//export async function generateCodePlanner(
//  request: AgentRequest
//): Promise<string> {
//  request.commandVariables = { languageModelID: "copilot-gpt-4" };
//
//  let defaultSystemPrompt = instructionTemplates;
//  request.userPrompt = `User: ${request.userPrompt}`;
//
//  const response = await getResponseAsStringCopilotInteraction(
//    defaultSystemPrompt,
//    request
//  );
//  request.response.markdown(response + "\n");
//  let apis = searchTopKBySteps(getStepsByResponse(response));
//  console.log(apis);
//  return apis.map((api) => JSON.stringify(api)).join("\n");
//}
