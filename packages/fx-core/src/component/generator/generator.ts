// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { ActionContext, ContextV3, FxError, Result, ok } from "@microsoft/teamsfx-api";
import {
  Component,
  sendTelemetryEvent,
  TelemetryEvent,
  TelemetryProperty,
} from "../../common/telemetry";
import { errorSource } from "../code/tab/constants";
import { ProgressMessages, ProgressTitles } from "../messages";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import {
  SampleActionSeq,
  GeneratorAction,
  TemplateActionSeq,
  GeneratorContext,
} from "./generatorAction";
import {
  getSampleInfoFromName,
  renderTemplateFileData,
  renderTemplateFileName,
  sampleDefaultOnActionError,
  templateDefaultOnActionError,
} from "./utils";

export class Generator {
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.generateTemplate,
      progressSteps: 1,
      errorSource: errorSource,
    }),
  ])
  public static async generateTemplate(
    templateName: string,
    language: string,
    destinationPath: string,
    ctx: ContextV3,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const appName = ctx.projectSetting?.appName;
    const projectId = ctx.projectSetting?.projectId;
    const nameReplaceMap = { ...{ appName: appName }, ...ctx.templateVariables };
    const dataReplaceMap = { ...{ projectId: projectId }, ...nameReplaceMap };
    const generatorContext: GeneratorContext = {
      name: `${templateName}-${language}`,
      destination: destinationPath,
      logProvider: ctx.logProvider,
      fileNameReplaceFn: (fileName: string, fileData: Buffer) =>
        renderTemplateFileName(fileName, fileData, nameReplaceMap),
      fileDataReplaceFn: (fileName: string, fileData: Buffer) =>
        renderTemplateFileData(fileName, fileData, dataReplaceMap),
      onActionError: templateDefaultOnActionError,
    };
    await actionContext?.progressBar?.next(ProgressMessages.generateTemplate);
    await this.generate(generatorContext, TemplateActionSeq);
    return ok(undefined);
  }

  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.generateSample,
      progressSteps: 1,
      errorSource: errorSource,
    }),
  ])
  public static async generateSample(
    sampleName: string,
    destinationPath: string,
    ctx: ContextV3,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const sample = getSampleInfoFromName(sampleName);
    // sample doesn't need replace function. Replacing projectId will be handled by core.
    const generatorContext: GeneratorContext = {
      name: sampleName,
      destination: destinationPath,
      logProvider: ctx.logProvider,
      zipUrl: sample.link,
      relativePath: sample.relativePath,
      onActionError: sampleDefaultOnActionError,
    };
    await actionContext?.progressBar?.next(ProgressMessages.generateSample);
    await this.generate(generatorContext, SampleActionSeq);
    return ok(undefined);
  }

  private static async generate(
    context: GeneratorContext,
    actions: GeneratorAction[]
  ): Promise<void> {
    sendTelemetryEvent(Component.core, TelemetryEvent.GenerateStart, {
      [TelemetryProperty.GenerateName]: context.name,
    });
    context.logProvider.info(`Start generating ${context.name}`);
    for (const action of actions) {
      try {
        await context.onActionStart?.(action, context);
        await action.run(context);
        await context.onActionEnd?.(action, context);
      } catch (e) {
        if (!context.onActionError) {
          throw e;
        }
        if (e instanceof Error) await context.onActionError(action, context, e);
      }
    }
    sendTelemetryEvent(Component.core, TelemetryEvent.Generate, {
      [TelemetryProperty.GenerateName]: context.name,
      [TelemetryProperty.GenerateFallback]: context.fallbackZipPath ? "true" : "false", // Track fallback cases.
    });
    context.logProvider.info(`Finish generating ${context.name}`);
  }
}
