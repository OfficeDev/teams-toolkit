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
import { convertToAlphanumericOnly } from "../../common/utils";
import { ProgressMessages, ProgressTitles } from "../messages";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { errorSource } from "./constant";
import { FetchZipFromUrlError, TemplateZipFallbackError, UnzipError } from "./error";
import {
  SampleActionSeq,
  GeneratorAction,
  TemplateActionSeq,
  GeneratorContext,
  GeneratorActionName,
} from "./generatorAction";
import {
  getSampleInfoFromName,
  getSampleRelativePath,
  renderTemplateFileData,
  renderTemplateFileName,
} from "./utils";

export class Generator {
  public static getDefaultVariables(appName: string): { [key: string]: string } {
    return {
      appName: appName,
      ProjectName: appName,
      SafeProjectName: convertToAlphanumericOnly(appName),
    };
  }
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.generateTemplate,
      progressSteps: 1,
      errorSource: errorSource,
    }),
  ])
  public static async generateTemplate(
    ctx: ContextV3,
    destinationPath: string,
    templateName: string,
    language?: string,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const replaceMap = ctx.templateVariables;
    const generatorContext: GeneratorContext = {
      name: language ? `${templateName}-${language}` : templateName,
      destination: destinationPath,
      logProvider: ctx.logProvider,
      fileNameReplaceFn: (fileName, fileData) =>
        renderTemplateFileName(fileName, fileData, replaceMap),
      fileDataReplaceFn: (fileName, fileData) =>
        renderTemplateFileData(fileName, fileData, replaceMap),
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
    ctx: ContextV3,
    destinationPath: string,
    sampleName: string,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const sample = getSampleInfoFromName(sampleName);
    // sample doesn't need replace function. Replacing projectId will be handled by core.
    const generatorContext: GeneratorContext = {
      name: sampleName,
      destination: destinationPath,
      logProvider: ctx.logProvider,
      zipUrl: sample.link,
      relativePath: sample.relativePath ?? getSampleRelativePath(sampleName),
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

async function templateDefaultOnActionError(
  action: GeneratorAction,
  context: GeneratorContext,
  error: Error
): Promise<void> {
  switch (action.name) {
    case GeneratorActionName.FetchTemplateUrlWithTag:
    case GeneratorActionName.FetchZipFromUrl:
      break;
    case GeneratorActionName.FetchTemplateZipFromLocal:
      throw new TemplateZipFallbackError();
    case GeneratorActionName.Unzip:
      throw new UnzipError();
    default:
      throw new Error(error.message);
  }
}

async function sampleDefaultOnActionError(
  action: GeneratorAction,
  context: GeneratorContext,
  error: Error
): Promise<void> {
  switch (action.name) {
    case GeneratorActionName.FetchZipFromUrl:
      throw new FetchZipFromUrlError(context.zipUrl!, error);
    case GeneratorActionName.Unzip:
      throw new UnzipError();
    default:
      throw new Error(error.message);
  }
}
