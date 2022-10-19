// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogProvider } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import { GeneratorAction } from "./generatorAction";

export interface GeneratorContext {
  name: string;
  destination: string;
  logProvider: LogProvider;
  relativePath?: string;
  zipUrl?: string;
  zip?: AdmZip;
  fallbackZipPath?: string;

  fileNameReplaceFn?: (name: string, data: Buffer) => string;
  fileDataReplaceFn?: (name: string, data: Buffer) => Buffer | string;

  onActionStart?: (action: GeneratorAction, context: GeneratorContext) => Promise<void>;
  onActionEnd?: (action: GeneratorAction, context: GeneratorContext) => Promise<void>;
  onActionError?: (
    action: GeneratorAction,
    context: GeneratorContext,
    error: Error
  ) => Promise<void>;
}
