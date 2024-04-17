// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { Context, FxError, Inputs, Result, err, ok } from "@microsoft/teamsfx-api";
import { TelemetryEvent, TelemetryProperty } from "../../../common/telemetry";
import { ProgressMessages, ProgressTitles } from "../../messages";
import { ActionContext, ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { commonTemplateName, componentName } from "../constant";
import {
  CapabilityOptions,
  MeArchitectureOptions,
  ProgrammingLanguage,
  QuestionNames,
} from "../../../question";
import { Generator, templateDefaultOnActionError } from "../generator";
import { convertToLangKey, renderTemplateFileData, renderTemplateFileName } from "../utils";
import { merge } from "lodash";
import { GeneratorContext, TemplateActionSeq } from "../generatorAction";
import { TemplateInfo } from "./templateInfo";
import { Feature2TemplateName } from "./templateNames";
import { getTemplateReplaceMap } from "./templateReplaceMap";

export class DefaultTemplateGenerator {
  // override this property to send telemetry event with different component name
  componentName = componentName;

  // override this method to determine whether to run this generator
  public activate(context: Context, inputs: Inputs): boolean {
    return Object.keys(Feature2TemplateName).some((feature) =>
      feature.startsWith(inputs.capabilities)
    );
  }

  // The main entry of the generator. Do not override this method.
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.create,
      progressSteps: 1,
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.GenerateTemplate,
    }),
  ])
  public async run(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const preResult = await this.getTemplateInfos(context, inputs, actionContext);
    if (preResult.isErr()) return err(preResult.error);

    const templateInfos = preResult.value;
    for (const templateInfo of templateInfos) {
      await this.scaffolding(context, templateInfo, destinationPath, actionContext);
    }

    const postRes = await this.post(context, inputs, destinationPath, actionContext);
    if (postRes.isErr()) return postRes;

    return ok(undefined);
  }

  // override this method to provide information of templates to be generated
  protected getTemplateInfos(
    context: Context,
    inputs: Inputs,
    actionContext?: ActionContext
  ): Promise<Result<TemplateInfo[], FxError>> {
    const templateName = this.getTemplateName(inputs);
    const language = inputs[QuestionNames.ProgrammingLanguage] as ProgrammingLanguage;
    const replaceMap = getTemplateReplaceMap(inputs);
    return Promise.resolve(ok([{ templateName, language, replaceMap }]));
  }

  // override this method to do post process
  protected post(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    return Promise.resolve(ok(undefined));
  }

  private getTemplateName(inputs: Inputs) {
    const language = inputs[QuestionNames.ProgrammingLanguage];
    const capability = inputs.capabilities as string;
    const meArchitecture = inputs[QuestionNames.MeArchitectureType] as string;
    const apiMEAuthType = inputs[QuestionNames.ApiMEAuth] as string;
    const trigger = inputs[QuestionNames.BotTrigger] as string;
    let feature = `${capability}:${trigger}`;
    if (
      capability === CapabilityOptions.m365SsoLaunchPage().id ||
      capability === CapabilityOptions.m365SearchMe().id
    ) {
      inputs.isM365 = true;
    }

    if (
      language === "csharp" &&
      capability === CapabilityOptions.notificationBot().id &&
      inputs.isIsolated === true
    ) {
      feature += "-isolated";
    }

    if (meArchitecture) {
      feature = `${feature}:${meArchitecture}`;
    }
    if (
      inputs.targetFramework &&
      inputs.targetFramework !== "net6.0" &&
      inputs.targetFramework !== "net7.0" &&
      (capability === CapabilityOptions.nonSsoTab().id || capability === CapabilityOptions.tab().id)
    ) {
      feature = `${capability}:ssr`;
    }

    if (
      capability === CapabilityOptions.m365SearchMe().id &&
      meArchitecture === MeArchitectureOptions.newApi().id
    ) {
      feature = `${feature}:${apiMEAuthType}`;
    }

    if (capability === CapabilityOptions.customCopilotRag().id) {
      feature = `${feature}:${inputs[QuestionNames.CustomCopilotRag] as string}`;
    } else if (capability === CapabilityOptions.customCopilotAssistant().id) {
      feature = `${feature}:${inputs[QuestionNames.CustomCopilotAssistant] as string}`;
    }

    return Feature2TemplateName[feature];
  }

  private async scaffolding(
    context: Context,
    templateInfo: TemplateInfo,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<void> {
    const name = templateInfo.templateName;
    const language = convertToLangKey(templateInfo.language) ?? commonTemplateName;
    const replaceMap = templateInfo.replaceMap;
    const filterFn = templateInfo.filterFn ?? (() => true);
    const templateName = `${name}-${language}`;
    merge(actionContext?.telemetryProps, {
      [TelemetryProperty.TemplateName]: templateName,
    });

    const generatorContext: GeneratorContext = {
      name: name,
      language: language,
      destination: destinationPath,
      logProvider: context.logProvider,
      fileNameReplaceFn: (fileName, fileData) =>
        renderTemplateFileName(fileName, fileData, replaceMap)
          .replace(/\\/g, "/")
          .replace(`${name}/`, ""),
      fileDataReplaceFn: (fileName, fileData) =>
        renderTemplateFileData(fileName, fileData, replaceMap),
      filterFn: (fileName) =>
        fileName.replace(/\\/g, "/").startsWith(`${name}/`) && filterFn(fileName),
      onActionError: templateDefaultOnActionError,
    };

    await actionContext?.progressBar?.next(ProgressMessages.generateTemplate);
    context.logProvider.debug(`Downloading app template "${templateName}" to ${destinationPath}`);
    await Generator.generate(generatorContext, TemplateActionSeq);

    merge(actionContext?.telemetryProps, {
      [TelemetryProperty.Fallback]: generatorContext.fallback ? "true" : "false", // Track fallback cases.
    });
  }
}
