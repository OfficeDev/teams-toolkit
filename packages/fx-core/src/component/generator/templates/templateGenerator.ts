// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { Context, FxError, Inputs, Result, err, ok } from "@microsoft/teamsfx-api";
import { TelemetryEvent, TelemetryProperty } from "../../../common/telemetry";
import { ProgressMessages, ProgressTitles } from "../../messages";
import { ActionContext, ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { commonTemplateName, componentName } from "../constant";
import { ProgrammingLanguage, QuestionNames } from "../../../question";
import { Generator, templateDefaultOnActionError } from "../generator";
import { convertToLangKey, renderTemplateFileData, renderTemplateFileName } from "../utils";
import { merge } from "lodash";
import { GeneratorContext, TemplateActionSeq } from "../generatorAction";
import { TemplateInfo } from "./templateInfo";
import { getTemplateName, tryGetTemplateName } from "./templateNames";
import { getTemplateReplaceMap } from "./templateReplaceMap";

export class DefaultTemplateGenerator {
  // override this property to send telemetry event with different component name
  componentName = componentName;

  // override this method to determine whether to run this generator
  public activate(context: Context, inputs: Inputs): boolean {
    return tryGetTemplateName(inputs) !== undefined;
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
  public getTemplateInfos(
    context: Context,
    inputs: Inputs,
    actionContext?: ActionContext
  ): Promise<Result<TemplateInfo[], FxError>> {
    const templateName = getTemplateName(inputs);
    const language = inputs[QuestionNames.ProgrammingLanguage] as ProgrammingLanguage;
    const replaceMap = getTemplateReplaceMap(inputs);
    return Promise.resolve(ok([{ templateName, language, replaceMap }]));
  }

  // override this method to do post process
  public post(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    return Promise.resolve(ok(undefined));
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
