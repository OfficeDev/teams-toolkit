// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ContextV3 } from "@microsoft/teamsfx-api";
import { SampleActionSeq, ScaffoldAction, TemplateActionSeq } from "./scaffoldAction";
import { ScaffoldContext } from "./scaffoldContext";
import {
  genFileDataRenderReplaceFn,
  genFileNameRenderReplaceFn,
  sampleDefaultOnActionError,
  templateDefaultOnActionError,
} from "./utils";

export class Generator {
  public static async generateFromTemplates(
    templateName: string,
    language: string,
    destinationPath: string,
    ctx: ContextV3
  ): Promise<void> {
    const appName = ctx.projectSetting?.appName;
    const projectId = ctx.projectSetting?.projectId;
    const scaffoldContext: ScaffoldContext = {
      scenario: `${templateName}_${language}`,
      destination: destinationPath,
      logProvider: ctx.logProvider,
      fileDataReplaceFn: genFileDataRenderReplaceFn({
        appName: appName,
        projectId: projectId,
      }),
      fileNameReplaceFn: genFileNameRenderReplaceFn({
        appName: appName,
        projectId: projectId,
      }),
      onActionError: templateDefaultOnActionError,
    };
    this.generate(scaffoldContext, TemplateActionSeq);
  }

  public static async generateFromSamples(
    sampleName: string,
    destinationPath: string,
    ctx: ContextV3
  ): Promise<void> {
    const projectId = ctx.projectSetting?.projectId;
    const scaffoldContext: ScaffoldContext = {
      scenario: sampleName,
      destination: destinationPath,
      logProvider: ctx.logProvider,
      fileDataReplaceFn: genFileDataRenderReplaceFn({
        projectId: projectId,
      }),
      fileNameReplaceFn: genFileNameRenderReplaceFn({
        projectId: projectId,
      }),
      onActionError: sampleDefaultOnActionError,
    };
    this.generate(scaffoldContext, SampleActionSeq);
  }

  private static async generate(
    context: ScaffoldContext,
    actions: ScaffoldAction[]
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
