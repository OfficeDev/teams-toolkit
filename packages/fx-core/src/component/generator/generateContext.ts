// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogProvider } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import { GenerateAction } from "./generateAction";

export interface GenerateContext {
  type: "template" | "sample" | "buildingBlock";
  name: string;
  destination: string;
  logProvider: LogProvider;
  relativePath?: string;
  zipUrl?: string;
  zip?: AdmZip;
  fallbackZipPath?: string;

  fileNameReplaceFn?: (name: string, data: Buffer) => string;
  fileDataReplaceFn?: (name: string, data: Buffer) => Buffer | string;

  onActionStart?: (action: GenerateAction, context: GenerateContext) => Promise<void>;
  onActionEnd?: (action: GenerateAction, context: GenerateContext) => Promise<void>;
  onActionError?: (action: GenerateAction, context: GenerateContext, error: Error) => Promise<void>;
}
