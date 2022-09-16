// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogProvider } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import { ScaffoldAction } from "./scaffoldAction";

export interface ScaffoldContext {
  name: string;
  destination: string;
  logProvider: LogProvider;
  appFolder?: string;
  zipUrl?: string;
  zip?: AdmZip;
  fallbackZipPath?: string;

  fileNameReplaceFn?: (name: string, data: Buffer) => string;
  fileDataReplaceFn?: (name: string, data: Buffer) => Buffer | string;

  onActionStart?: (action: ScaffoldAction, context: ScaffoldContext) => Promise<void>;
  onActionEnd?: (action: ScaffoldAction, context: ScaffoldContext) => Promise<void>;
  onActionError?: (action: ScaffoldAction, context: ScaffoldContext, error: Error) => Promise<void>;
}
