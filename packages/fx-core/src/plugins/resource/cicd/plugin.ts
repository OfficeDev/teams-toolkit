// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Context, EnvInfoV2 } from "@microsoft/teamsfx-api/build/v2";
import { Inputs, v2 } from "@microsoft/teamsfx-api";
import { FxResult, FxCICDPluginResultFactory as ResultFactory } from "./result";
import { CICDProviderFactory } from "./providers/factory";

export class CICDImpl {
  public async addCICDWorkflows(
    context: Context,
    inputs: Inputs,
    envInfo: v2.EnvInfoV2
  ): Promise<FxResult> {
    // 1. Key inputs (envName, provider, template) x (hostingType, ).
    const envName = envInfo.envName;
    const providerName = inputs[questionNames.Provider];
    const templateName = inputs[questionNames.Template];

    // 2. Call factory to get provider instance.
    const providerInstance = CICDProviderFactory.create(providerName as ProviderKind);

    // 3. Call instance.scaffold(template, replacements: Map<string, string>).
    //  3.1 Construct replacements.
    const replacements = {
      env_name: envName,
      build_script: "",
      ut_script: "",
      hosting_type_is_spfx: false,
      hosting_type_is_azure: true,
    };
    //  3.2 Call scaffold by (templateName, replacements).
    providerInstance.scaffold(templateName, replacements);

    // 4. Notification & Preview scaffolded readme.

    return ResultFactory.Success();
  }
}
