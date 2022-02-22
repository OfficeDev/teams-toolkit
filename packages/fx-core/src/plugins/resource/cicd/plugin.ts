// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Context } from "@microsoft/teamsfx-api/build/v2";
import { Inputs, v2, Result, FxError, Platform } from "@microsoft/teamsfx-api";
import { FxCICDPluginResultFactory as ResultFactory } from "./result";
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
    // By default(VSC), get env name from plugin's own `target-env` question.
    let envName = inputs[questionNames.Environment];
    if (inputs.platform == Platform.CLI) {
      // In CLI, get env name from the default `env` question.
      envName = envInfo.envName;
    }
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
    await providerInstance.scaffold(projectPath, templateNames[0], replacements);

    //  3.2 Call scaffold.
    for (const templateName of templateNames.slice(1)) {
      await progressBar.next(`Scaffolding workflow file for ${templateName}.`);
      await providerInstance.scaffold(projectPath, templateName, replacements);
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
