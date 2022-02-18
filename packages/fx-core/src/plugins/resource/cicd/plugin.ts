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
    const templateNames = inputs[questionNames.Template] as string[];
    if (!envName || !providerName || templateNames.length == 0) {
      throw new InternalError("Some preconditions of inputs are not met.");
    }

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
      hosting_type_contains_spfx: hostType == "SPFx",
      hosting_type_contains_azure: hostType == "Azure",
    };
    const progressBar = context.userInteraction.createProgressBar(
      "Scaffolding workflow automation files",
      templateNames.length
    );
    await progressBar.start(`Scaffolding workflow file for ${templateNames[0]}.`);
    //  3.2 Call scaffold.
    for (let i = 0; i < templateNames.length; i += 1) {
      await providerInstance.scaffold(projectPath, templateNames[i], replacements);
      if (i < templateNames.length) {
        await progressBar.next(`Scaffolding workflow file for ${templateNames[0]}.`);
      }
    }
    await progressBar.end(true);

    // 4. Notification & Preview scaffolded readme.
    context.userInteraction.showMessage(
      "info",
      `Workflow automation files for ${providerName} have been successfully added for your project. Follow the instructuons in Readme file to setup the workflow.`,
      false
    );
    return ResultFactory.Success();
  }
}
