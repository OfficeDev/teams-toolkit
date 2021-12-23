// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, Inputs, FxError, Result, ok, err } from "@microsoft/teamsfx-api";

export class AppStudioPluginV3 {
  // Generate initial manifest template file, for both local debug & remote
  async init(ctx: Context, inputs: Inputs): Promise<Result<any, FxError>> {
    return ok(undefined);
  }

  // Append to manifest template file
  async addCapabilities(
    capabilities: ("staticTab" | "configurableTab" | "Bot" | "MessasgeExtension")[]
  ): Promise<Result<any, FxError>> {
    capabilities.map((capability) => {
      if (this.capabilityExceedLimit(capabilities[0])) {
        return err(new Error("Exeed limit."));
      }
    });
    return ok(undefined);
  }

  // Need to add incremental capabilities and append to manifest template
  async scaffold(
    capabilities: ("staticTab" | "configurableTab" | "Bot" | "MessasgeExtension")[]
  ): Promise<Result<any, FxError>> {
    return ok(undefined);
  }

  // Read from manifest template, and check if it exceeds the limit.
  // The limit of staticTab if 16, others are 1
  // Should check both local & remote manifest template file
  private async capabilityExceedLimit(
    capability: "staticTab" | "configurableTab" | "Bot" | "MessasgeExtension"
  ): Promise<boolean> {
    return false;
  }
}
