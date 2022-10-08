// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ContextV3 } from "@microsoft/teamsfx-api";
import path from "path";
import {
  Component,
  sendTelemetryEvent,
  TelemetryEvent,
  TelemetryProperty,
} from "../../common/telemetry";
import { SampleActionSeq, GenerateAction, TemplateActionSeq } from "./generateAction";
import { GenerateContext } from "./generateContext";
import {
  genFileDataRenderReplaceFn,
  genFileNameRenderReplaceFn,
  getSampleInfoFromName,
  getValidSampleDestination,
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
    const destination = path.join(destinationPath, appName);
    const generateContext: GenerateContext = {
      type: "template",
      name: `${templateName}_${language}`,
      destination: destination,
      logProvider: ctx.logProvider,
      fileDataReplaceFn: genFileDataRenderReplaceFn(dataReplaceMap),
      fileNameReplaceFn: genFileNameRenderReplaceFn(nameReplaceMap),
      onActionError: templateDefaultOnActionError,
    };
    await this.generate(generateContext, TemplateActionSeq);
  }

  public static async addBuildingBlock(
    buildingBlockName: string,
    language: string,
    destinationPath: string,
    ctx: ContextV3
  ): Promise<void> {
    const appName = ctx.projectSetting?.appName;
    const projectId = ctx.projectSetting?.projectId;
    const nameReplaceMap = { ...{ appName: appName }, ...ctx.templateVariables };
    const dataReplaceMap = { ...{ projectId: projectId }, ...nameReplaceMap };
    const destination = destinationPath;
    const generateContext: GenerateContext = {
      type: "buildingBlock",
      name: `${buildingBlockName}_${language}`,
      destination: destination,
      logProvider: ctx.logProvider,
      fileDataReplaceFn: genFileDataRenderReplaceFn(dataReplaceMap),
      fileNameReplaceFn: genFileNameRenderReplaceFn(nameReplaceMap),
      onActionError: templateDefaultOnActionError,
    };
    await this.generate(generateContext, TemplateActionSeq);
  }

  public static async generateSample(
    sampleName: string,
    destinationPath: string,
    ctx: ContextV3
  ): Promise<void> {
    const destination = await getValidSampleDestination(sampleName, destinationPath);
    const sample = getSampleInfoFromName(sampleName);
    // sample doesn't need replace function. Replacing projectId will be handled by core.
    const generateContext: GenerateContext = {
      type: "sample",
      name: sampleName,
      destination: destination,
      logProvider: ctx.logProvider,
      zipUrl: sample.link,
      relativePath: sample.relativePath,
      onActionError: sampleDefaultOnActionError,
    };
    await this.generate(generateContext, SampleActionSeq);
  }

  private static async generate(
    context: GenerateContext,
    actions: GenerateAction[]
  ): Promise<void> {
    sendTelemetryEvent(Component.core, TelemetryEvent.GenerateStart, {
      [TelemetryProperty.GenerateType]: context.type,
      [TelemetryProperty.GenerateName]: context.name,
    });
    context.logProvider.info(`Start generating ${context.type} ${context.name}`);
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
      [TelemetryProperty.GenerateType]: context.type,
      [TelemetryProperty.GenerateName]: context.name,
      [TelemetryProperty.GenerateFallback]: context.fallbackZipPath ? "true" : "false", // Track fallback cases.
    });
    context.logProvider.info(`Finish generating ${context.type} ${context.name}`);
  }
}
