// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ContextV3 } from "@microsoft/teamsfx-api";
import {
  Component,
  sendTelemetryEvent,
  TelemetryEvent,
  TelemetryProperty,
} from "../../common/telemetry";
import { SampleActionSeq, GeneratorAction, TemplateActionSeq } from "./generatorAction";
import { GeneratorContext } from "./generatorContext";
import {
  getSampleInfoFromName,
  renderTemplateFileData,
  renderTemplateFileName,
  sampleDefaultOnActionError,
  templateDefaultOnActionError,
} from "./utils";

export class Generator {
  public static async generateTemplate(
    templateName: string,
    language: string,
    destinationPath: string,
    ctx: ContextV3
  ): Promise<void> {
    const appName = ctx.projectSetting?.appName;
    const projectId = ctx.projectSetting?.projectId;
    const nameReplaceMap = { ...{ appName: appName }, ...ctx.templateVariables };
    const dataReplaceMap = { ...{ projectId: projectId }, ...nameReplaceMap };
    const generatorContext: GeneratorContext = {
      name: `${templateName}_${language}`,
      destination: destinationPath,
      logProvider: ctx.logProvider,
      fileNameReplaceFn: (fileName: string, fileData: Buffer) =>
        renderTemplateFileName(fileName, fileData, nameReplaceMap),
      fileDataReplaceFn: (fileName: string, fileData: Buffer) =>
        renderTemplateFileData(fileName, fileData, dataReplaceMap),
      onActionError: templateDefaultOnActionError,
    };
    await this.generate(generatorContext, TemplateActionSeq);
  }

  public static async generateSample(
    sampleName: string,
    destinationPath: string,
    ctx: ContextV3
  ): Promise<void> {
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
    await this.generate(generatorContext, SampleActionSeq);
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
