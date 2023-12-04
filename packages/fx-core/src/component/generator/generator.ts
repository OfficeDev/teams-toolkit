// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { Context, FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { merge } from "lodash";
import { TelemetryEvent, TelemetryProperty } from "../../common/telemetry";
import { convertToAlphanumericOnly } from "../../common/utils";
import { BaseComponentInnerError } from "../error/componentError";
import { LogMessages, ProgressMessages, ProgressTitles } from "../messages";
import { ActionContext, ActionExecutionMW } from "../middleware/actionExecutionMW";
import {
  commonTemplateName,
  componentName,
  errorSource,
  sampleDefaultTimeoutInMs,
} from "./constant";
import {
  CancelDownloading,
  DownloadSampleApiLimitError,
  DownloadSampleNetworkError,
  FetchSampleInfoError,
  TemplateNotFoundError,
  TemplateZipFallbackError,
  UnzipError,
} from "./error";
import {
  DownloadDirectoryActionSeq,
  GeneratorAction,
  GeneratorActionName,
  GeneratorContext,
  TemplateActionSeq,
} from "./generatorAction";
import {
  convertToUrl,
  isApiLimitError,
  renderTemplateFileData,
  renderTemplateFileName,
} from "./utils";
import { enableTestToolByDefault } from "../../common/featureFlags";
import { getSafeRegistrationIdEnvName } from "../../common/spec-parser/utils";

export class Generator {
  public static getDefaultVariables(
    appName: string,
    safeProjectNameFromVS?: string,
    targetFramework?: string,
    apiKeyAuthData?: { authName: string; openapiSpecPath: string; registrationIdEnvName: string }
  ): { [key: string]: string } {
    const safeProjectName = safeProjectNameFromVS ?? convertToAlphanumericOnly(appName);

    const safeRegistrationIdEnvName = getSafeRegistrationIdEnvName(
      apiKeyAuthData?.registrationIdEnvName ?? ""
    );

    return {
      appName: appName,
      ProjectName: appName,
      TargetFramework: targetFramework ?? "net8.0",
      SafeProjectName: safeProjectName,
      SafeProjectNameLowerCase: safeProjectName.toLocaleLowerCase(),
      ApiSpecAuthName: apiKeyAuthData?.authName ?? "",
      ApiSpecAuthRegistrationIdEnvName: safeRegistrationIdEnvName,
      ApiSpecPath: apiKeyAuthData?.openapiSpecPath ?? "",
      enableTestToolByDefault: enableTestToolByDefault() ? "true" : "",
    };
  }
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.create,
      progressSteps: 1,
      componentName: componentName,
      errorSource: errorSource,
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.GenerateTemplate,
    }),
  ])
  public static async generateTemplate(
    ctx: Context,
    destinationPath: string,
    scenario: string,
    language?: string,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const replaceMap = ctx.templateVariables ?? {};
    const generatorContext: GeneratorContext = {
      name: scenario,
      language: language ?? commonTemplateName,
      destination: destinationPath,
      logProvider: ctx.logProvider,
      fileNameReplaceFn: (fileName, fileData) =>
        renderTemplateFileName(fileName, fileData, replaceMap)
          .replace(/\\/g, "/")
          .replace(`${scenario}/`, ""),
      fileDataReplaceFn: (fileName, fileData) =>
        renderTemplateFileData(fileName, fileData, replaceMap),
      filterFn: (fileName) => fileName.replace(/\\/g, "/").startsWith(`${scenario}/`),
      onActionError: templateDefaultOnActionError,
    };
    const templateName = `${scenario}-${generatorContext.name}`;
    merge(actionContext?.telemetryProps, {
      [TelemetryProperty.TemplateName]: templateName,
    });

    await actionContext?.progressBar?.next(ProgressMessages.generateTemplate);
    ctx.logProvider.debug(`Downloading app template "${templateName}" to ${destinationPath}`);
    await this.generate(generatorContext, TemplateActionSeq);

    merge(actionContext?.telemetryProps, {
      [TelemetryProperty.Fallback]: generatorContext.fallback ? "true" : "false", // Track fallback cases.
    });
    if (!generatorContext.outputs?.length) {
      return err(new TemplateNotFoundError(scenario).toFxError());
    }
    return ok(undefined);
  }

  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.create,
      progressSteps: 1,
      componentName: componentName,
      errorSource: errorSource,
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.GenerateSample,
    }),
  ])
  public static async generateSample(
    ctx: Context,
    destinationPath: string,
    sampleName: string,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    merge(actionContext?.telemetryProps, {
      [TelemetryProperty.SampleAppName]: sampleName,
      [TelemetryProperty.SampleDownloadDirectory]: "true",
    });
    // sample doesn't need replace function. Replacing projectId will be handled by core.

    const generatorContext: GeneratorContext = {
      name: sampleName,
      destination: destinationPath,
      logProvider: ctx.logProvider,
      timeoutInMs: sampleDefaultTimeoutInMs,
      onActionError: sampleDefaultOnActionError,
    };

    await actionContext?.progressBar?.next(ProgressMessages.generateSample(sampleName));
    ctx.logProvider.debug(`Downloading sample "${sampleName}" to ${destinationPath}`);
    await this.generate(generatorContext, DownloadDirectoryActionSeq);
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
        if (e instanceof BaseComponentInnerError) throw e.toFxError();
        if (e instanceof Error) await context.onActionError(action, context, e);
      }
    }
  }
}

export function templateDefaultOnActionError(
  action: GeneratorAction,
  context: GeneratorContext,
  error: Error
): Promise<void> {
  switch (action.name) {
    case GeneratorActionName.FetchTemplateUrlWithTag:
    case GeneratorActionName.FetchZipFromUrl:
      context.cancelDownloading = true;
      if (!(error instanceof CancelDownloading)) {
        context.logProvider.info(error.message);
        context.logProvider.info(LogMessages.getTemplateFromLocal);
      }
      break;
    case GeneratorActionName.FetchTemplateZipFromLocal:
      context.logProvider.error(error.message);
      return Promise.reject(new TemplateZipFallbackError().toFxError());
    case GeneratorActionName.Unzip:
      context.logProvider.error(error.message);
      return Promise.reject(new UnzipError().toFxError());
    default:
      return Promise.reject(new Error(error.message));
  }
  return Promise.resolve();
}

export async function sampleDefaultOnActionError(
  action: GeneratorAction,
  context: GeneratorContext,
  error: Error
): Promise<void> {
  context.logProvider.error(error.message);
  if (await fs.pathExists(context.destination)) {
    await fs.rm(context.destination, { recursive: true });
  }
  switch (action.name) {
    case GeneratorActionName.FetchSampleInfo:
      throw new FetchSampleInfoError(error).toFxError();
    case GeneratorActionName.DownloadDirectory:
      const url = convertToUrl(context.sampleInfo!);
      if (isApiLimitError(error)) {
        throw new DownloadSampleApiLimitError(url, error).toFxError();
      } else {
        throw new DownloadSampleNetworkError(url, error).toFxError();
      }
    default:
      throw new Error(error.message);
  }
}
