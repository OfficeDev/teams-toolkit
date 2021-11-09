import { ImportSingleExportInfo } from "./importInfo";

export interface Replacement {
  sourceTokens: Array<string>;
  targetTokens: Array<string>;
}

export interface ImportInfoInReplacement {
  importSingleExportInfo?: ImportSingleExportInfo;
}

export interface FunctionReplacement extends Replacement {
  callbackToPromise: boolean;
  callbackPosition: number;
}

export type TargetReplacement = ImportInfoInReplacement & Replacement;
export type TargetFunctionReplacement = ImportInfoInReplacement & FunctionReplacement;
