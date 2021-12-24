// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Result,
  ok,
  err,
  v2,
  IComposeExtension,
  IBot,
  IConfigurableTab,
  IStaticTab,
} from "@microsoft/teamsfx-api";
import { BuiltInResourcePluginNames } from "../../../solution/fx-solution/v3/constants";
import { Service } from "typedi";

@Service(BuiltInResourcePluginNames.appStudio)
export class AppStudioPluginV3 {
  // Generate initial manifest template file, for both local debug & remote
  async init(ctx: v2.Context, inputs: v2.InputsWithProjectPath): Promise<Result<any, FxError>> {
    return ok(undefined);
  }

  // Append to manifest template file
  async addCapabilities(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capabilities: (
      | { name: "staticTab"; snippet?: IStaticTab }
      | { name: "configurableTab"; snippet?: IConfigurableTab }
      | { name: "Bot"; snippet?: IBot }
      | { name: "MessageExtension"; snippet?: IComposeExtension }
    )[]
  ): Promise<Result<any, FxError>> {
    capabilities.map((capability) => {
      if (this.capabilityExceedLimit(ctx, inputs, capability.name)) {
        return err(new Error("Exeed limit."));
      }
    });
    return ok(undefined);
  }

  // Read from manifest template, and check if it exceeds the limit.
  // The limit of staticTab if 16, others are 1
  // Should check both local & remote manifest template file
  public async capabilityExceedLimit(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension"
  ): Promise<boolean> {
    return false;
  }
}
