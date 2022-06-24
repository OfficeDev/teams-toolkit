// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, Result, v2, v3, Void } from "@microsoft/teamsfx-api";
import {
  capabilityExceedLimit,
  deleteCapability,
  updateCapability,
} from "../../../plugins/resource/appstudio/manifestTemplate";
import { addCapabilities } from "./appManifest";

export class DefaultManifestProvider implements v3.AppManifestProvider {
  async updateCapability(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capability: v3.ManifestCapability
  ): Promise<Result<Void, FxError>> {
    return await updateCapability(inputs.projectPath, capability);
  }
  async deleteCapability(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capability: v3.ManifestCapability
  ): Promise<Result<Void, FxError>> {
    return await deleteCapability(inputs.projectPath, capability);
  }
  async capabilityExceedLimit(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension" | "WebApplicationInfo"
  ): Promise<Result<boolean, FxError>> {
    return await capabilityExceedLimit(inputs.projectPath, capability);
  }
  async addCapabilities(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capabilities: v3.ManifestCapability[]
  ): Promise<Result<Void, FxError>> {
    const res = await addCapabilities(inputs, capabilities);
    if (res.isErr()) return err(res.error);
    return ok(Void);
  }
}
