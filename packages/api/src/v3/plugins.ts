// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "../error";
import { Void } from "../types";
import { Context, InputsWithProjectPath } from "../v2/types";
import { ManifestCapability } from "./types";

export interface AppManifestProvider {
  addCapabilities: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    capabilities: ManifestCapability[]
  ) => Promise<Result<Void, FxError>>;

  updateCapability: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    capability: ManifestCapability
  ) => Promise<Result<Void, FxError>>;

  deleteCapability: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    capability: ManifestCapability
  ) => Promise<Result<Void, FxError>>;

  capabilityExceedLimit: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension" | "WebApplicationInfo"
  ) => Promise<Result<boolean, FxError>>;
}
