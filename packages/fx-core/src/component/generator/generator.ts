// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { ActionContext, ContextV3, FxError, Result, ok } from "@microsoft/teamsfx-api";
import { merge } from "lodash";
import { TelemetryEvent, TelemetryProperty } from "../../common/telemetry";
import { convertToAlphanumericOnly } from "../../common/utils";
import { LogMessages, ProgressMessages, ProgressTitles } from "../messages";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import {
  errorSource,
  componentName,
  commonTemplateName,
  sampleDefaultTimeoutInMs,
} from "./constant";
import {
  CancelDownloading,
  FetchZipFromUrlError,
  TemplateZipFallbackError,
  UnzipError,
} from "./error";
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
      componentName: componentName,
      errorSource: errorSource,
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.GenerateTemplate,
    }),
  ])
  public static async generateTemplate(
    ctx: ContextV3,
    destinationPath: string,
    scenario: string,
    language?: string,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const replaceMap = ctx.templateVariables ?? {};
    const generatorContext: GeneratorContext = {
      name: language ?? commonTemplateName,
      relativePath: `${scenario}/`,
      destination: destinationPath,
      logProvider: ctx.logProvider,
      fileNameReplaceFn: (fileName, fileData) =>
        renderTemplateFileName(fileName, fileData, replaceMap),
      fileDataReplaceFn: (fileName, fileData) =>
        renderTemplateFileData(fileName, fileData, replaceMap),
      onActionError: templateDefaultOnActionError,
    };
    merge(actionContext?.telemetryProps, {
      [TelemetryProperty.TemplateName]: `${scenario}-${generatorContext.name}`,
    });
    await actionContext?.progressBar?.next(ProgressMessages.generateTemplate());
    await this.generate(generatorContext, TemplateActionSeq);
    merge(actionContext?.telemetryProps, {
      [TelemetryProperty.Fallback]: generatorContext.fallbackZipPath ? "true" : "false", // Track fallback cases.
    });
    return ok(undefined);
  }

  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.generateSample,
      progressSteps: 1,
      componentName: componentName,
      errorSource: errorSource,
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.GenerateSample,
    }),
  ])
  public static async generateSample(
    ctx: ContextV3,
    destinationPath: string,
    sampleName: string,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    merge(actionContext?.telemetryProps, {
      [TelemetryProperty.SampleName]: sampleName,
    });
    const sample = getSampleInfoFromName(sampleName);
    // sample doesn't need replace function. Replacing projectId will be handled by core.
    const generatorContext: GeneratorContext = {
      name: sampleName,
      destination: destinationPath,
      logProvider: ctx.logProvider,
      zipUrl: sample.link,
      timeoutInMs: sampleDefaultTimeoutInMs,
      relativePath: sample.relativePath ?? getSampleRelativePath(sampleName),
      onActionError: sampleDefaultOnActionError,
    };

    await actionContext?.progressBar?.next(ProgressMessages.generateSample());
    await this.generate(generatorContext, SampleActionSeq);
    return ok(undefined);
  }

  private static async generate(
    context: GeneratorContext,
    actions: GeneratorAction[]
  ): Promise<void> {
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
  }
}

export async function templateDefaultOnActionError(
  action: GeneratorAction,
  context: GeneratorContext,
  error: Error
): Promise<void> {
  switch (action.name) {
    case GeneratorActionName.FetchTemplateUrlWithTag:
    case GeneratorActionName.FetchZipFromUrl:
      context.cancelDownloading = true;
      if (!(error instanceof CancelDownloading)) {
        await context.logProvider.info(error.message);
        await context.logProvider.info(LogMessages.getTemplateFromLocal);
      }
      break;
    case GeneratorActionName.FetchTemplateZipFromLocal:
      await context.logProvider.error(error.message);
      throw new TemplateZipFallbackError().toFxError();
    case GeneratorActionName.Unzip:
      await context.logProvider.error(error.message);
      throw new UnzipError().toFxError();
    default:
      throw new Error(error.message);
  }
}

export async function sampleDefaultOnActionError(
  action: GeneratorAction,
  context: GeneratorContext,
  error: Error
): Promise<void> {
  await context.logProvider.error(error.message);
  switch (action.name) {
    case GeneratorActionName.FetchZipFromUrl:
      throw new FetchZipFromUrlError(context.zipUrl!).toFxError();
    case GeneratorActionName.Unzip:
      throw new UnzipError().toFxError();
    default:
      throw new Error(error.message);
  }
}
