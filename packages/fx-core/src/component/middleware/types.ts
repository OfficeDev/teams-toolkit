// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ContextV3, FxError, IProgressHandler, LogProvider } from "@microsoft/teamsfx-api";

export interface ActionContext extends ContextV3 {
  local?: Record<string, any>;
  stage: string;
  logger?: LogProvider;
  progressBar?: IProgressHandler;
}

export type ErrorHanlder = (context: ActionContext, error: any) => Promise<FxError>;
