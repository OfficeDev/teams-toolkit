// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Context, EnvInfoV2 } from "@microsoft/teamsfx-api/build/v2";
import { Inputs, v2 } from "@microsoft/teamsfx-api";
import { FxResult, FxCICDPluginResultFactory as ResultFactory } from "./result";

export class CICDImpl {
  public async addCICDWorkflows(
    context: Context,
    inputs: Inputs,
    envInfo: v2.EnvInfoV2
  ): Promise<FxResult> {
    // 1. Key inputs (envName, provider, template) x (hostingType, ).
    // 2. Call factory to get provider instance.
    // 3. Call instance.scaffold(template, replacements: Map<string, string>).
    // 4. Notification & Preview scaffoled readme.

    return ResultFactory.Success();
  }
}
