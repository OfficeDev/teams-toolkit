// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Context, EnvInfoV2 } from "@microsoft/teamsfx-api/build/v2";
import { Inputs, v2, Result, FxError } from "@microsoft/teamsfx-api";
import { FxResult, FxCICDPluginResultFactory as ResultFactory } from "./result";
import { CICDProviderFactory } from "./providers/factory";
import { ProviderKind } from "./providers/enums";
import { questionNames } from "./questions";
import { InternalError } from "./errors";
import { generateBuildScript } from "./utils/buildScripts";

export class CICDImpl {
  public async addCICDWorkflows(
    context: Context,
    inputs: Inputs,
    envInfo: v2.EnvInfoV2
  ): Promise<Result<any, FxError>> {
    // 1. Key inputs (envName, provider, template) x (hostingType, ).
    if (!inputs.projectPath) {
      throw new InternalError("Project path is undefined.");
    }
    const projectPath = inputs.projectPath;
    const envName = envInfo.envName;
    const providerName = inputs[questionNames.Provider];
    const templateName = inputs[questionNames.Template];

    // 2. Call factory to get provider instance.
    const providerInstance = CICDProviderFactory.create(providerName as ProviderKind);

    // 3. Call instance.scaffold(template, replacements: any).
    //  3.1 Construct replacements.
    const solutionSettings = context.projectSetting.solutionSettings;
    const hostType = solutionSettings?.hostType;
    const capabilities = solutionSettings?.capabilities;
    const programmingLanguage = solutionSettings?.programmingLanguage;
    const replacements = {
      env_name: envName,
      build_script: generateBuildScript(capabilities, programmingLanguage),
      ut_script: "echo nothing",
      hosting_type_contains_spfx: hostType == "SPFx",
      hosting_type_contains_azure: hostType == "Azure",
    };
    //  3.2 Call scaffold.
    const res = await providerInstance.scaffold(projectPath, templateName, replacements);

    // 4. Notification & Preview scaffolded readme.

    return ResultFactory.Success();
  }
}
