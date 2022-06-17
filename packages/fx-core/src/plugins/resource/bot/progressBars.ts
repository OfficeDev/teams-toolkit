// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler, PluginContext, v2 } from "@microsoft/teamsfx-api";

export class ProgressBarFactory {
  // To store working in progress bars.
  private static progressBars: Map<string, IProgressHandler> = new Map();

  public static async newProgressBar(
    name: string,
    steps_num: number,
    context: PluginContext | v2.Context
  ): Promise<IProgressHandler> {
    const existsHandler = ProgressBarFactory.progressBars.get(name);
    if (existsHandler) {
      await existsHandler.end(true);
      return existsHandler;
    }

    const handler =
      (context as PluginContext).ui?.createProgressBar(name, steps_num) ||
      (context as v2.Context).userInteraction?.createProgressBar(name, steps_num);
    if (!handler) {
      await context.logProvider?.warning(`Fail to create progress bar for ${name}.`);
    }

    ProgressBarFactory.progressBars.set(name, handler);

    return handler;
  }

  public static async closeProgressBar(success: boolean, name?: string): Promise<void> {
    if (name) {
      await ProgressBarFactory.progressBars.get(name)?.end(success);
    } else {
      for (const key of ProgressBarFactory.progressBars.keys()) {
        await ProgressBarFactory.progressBars.get(key)?.end(success);
      }
    }
  }
}
