// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, TokenProvider } from "..";
import { Inputs, Json, Void } from "../types";
import { Context } from "../v2/types";
import { RuntimeStacks } from "./AzureResource";

export interface InnerLoopPlugin {
  runtimeStacks: RuntimeStacks[];
  languages: string[];
  scaffoldSourceCode: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;
  build: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;
  provisionLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;
}
