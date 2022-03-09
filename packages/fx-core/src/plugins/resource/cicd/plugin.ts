// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Context } from "@microsoft/teamsfx-api/build/v2";
import { Inputs, v2, Result, FxError, Platform } from "@microsoft/teamsfx-api";
import { FxCICDPluginResultFactory as ResultFactory } from "./result";
import { CICDProviderFactory } from "./providers/factory";
import { ProviderKind } from "./providers/enums";
import { questionNames } from "./questions";
import { InternalError, NoProjectOpenedError } from "./errors";
import { telemetryHelper } from "./utils/telemetry-helper";
import { Logger } from "./logger";

export class CICDImpl {
  public async addCICDWorkflows(
    context: Context,
    inputs: Inputs,
    envInfo: v2.EnvInfoV2
  ): Promise<Result<any, FxError>> {
    // 1. Key inputs (envName, provider, template) x (hostingType, ).
    if (!inputs.projectPath) {
      throw new NoProjectOpenedError();
    }
    const projectPath = inputs.projectPath;
    // By default(VSC), get env name from plugin's own `target-env` question.
    let envName = inputs[questionNames.Environment];
    // TODO: add support for VS/.Net Projects.
    if (inputs.platform === Platform.CLI) {
      // In CLI, get env name from the default `env` question.
      envName = envInfo.envName;
    }
    const providerName = inputs[questionNames.Provider];
    const templateNames = inputs[questionNames.Template] as string[];
    if (!envName || !providerName || templateNames.length === 0) {
      throw new InternalError("Some preconditions of inputs are not met.");
    }

    telemetryHelper.sendSuccessEvent(context, envInfo, "collect-cicd-questions", {
      env: envName,
      provider: providerName,
      template: templateNames.join(","),
    });

    // 2. Call factory to get provider instance.
    const providerInstance = CICDProviderFactory.create(providerName as ProviderKind);

    // 3. Call instance.scaffold(template, replacements: any).
    //  3.1 Call the initial scaffold.
    const progressBar = context.userInteraction.createProgressBar(
      "Scaffolding workflow automation files",
      templateNames.length
    );

    const scaffoldedArr: boolean[] = [];
    await progressBar.start(`Scaffolding workflow file for ${templateNames[0]}.`);
    let scaffolded = await providerInstance.scaffold(
      projectPath,
      templateNames[0],
      envName,
      context
    );
    scaffolded.isOk() && scaffoldedArr.push(scaffolded.value);
    //  3.2 Call the next scaffold.
    for (const templateName of templateNames.slice(1)) {
      await progressBar.next(`Scaffolding workflow file for ${templateName}.`);
      scaffolded = await providerInstance.scaffold(projectPath, templateName, envName, context);
      scaffolded.isOk() && scaffoldedArr.push(scaffolded.value);
    }

    await progressBar.end(true);

    // 4. Send notification messages.
    const scaffoldedTemplates: string[] = [];
    const notScaffoldedTemplates: string[] = [];
    scaffoldedArr.map((value, index) => {
      if (value) {
        scaffoldedTemplates.push(templateNames[index]);
      } else {
        notScaffoldedTemplates.push(templateNames[index]);
      }
    });

    if (notScaffoldedTemplates.length > 0) {
      const message = `Workflow automation file(s) of ${notScaffoldedTemplates.join(
        ","
      )} for ${providerName} have been successfully added for your project. Follow the instructuons in Readme file to setup the workflow.`;

      context.userInteraction.showMessage("info", message, false);

      Logger.info(message);
    }

    if (scaffoldedTemplates.length > 0) {
      const message = `You have already created template(s) of ${scaffoldedTemplates.join(
        ","
      )} for ${providerName}, please customize it or remove it to create a new one.`;

      context.userInteraction.showMessage("info", message, false);

      Logger.info(message);
    }

    return ResultFactory.Success();
  }
}
