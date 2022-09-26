// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, Result, v2, v3, Void } from "@microsoft/teamsfx-api";
import { manifestUtils } from "./utils/ManifestUtils";

export class DefaultManifestProvider implements v3.AppManifestProvider {
  async updateCapability(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capability: v3.ManifestCapability
  ): Promise<Result<Void, FxError>> {
    const res = await manifestUtils.updateCapability(inputs.projectPath, capability);
    if (res.isErr()) return err(res.error);
    return ok(Void);
  }
  async deleteCapability(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capability: v3.ManifestCapability
  ): Promise<Result<Void, FxError>> {
    const res = await manifestUtils.deleteCapability(inputs.projectPath, capability);
    if (res.isErr()) return err(res.error);
    return ok(Void);
  }
  async capabilityExceedLimit(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension" | "WebApplicationInfo"
  ): Promise<Result<boolean, FxError>> {
    return await manifestUtils.capabilityExceedLimit(inputs.projectPath, capability);
  }
  async addCapabilities(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capabilities: v3.ManifestCapability[]
  ): Promise<Result<Void, FxError>> {
    const res = await manifestUtils.addCapabilities(inputs, capabilities);
    if (res.isErr()) return err(res.error);
    return ok(Void);
  }
}
