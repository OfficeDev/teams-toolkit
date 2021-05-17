// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler, PluginContext } from "@microsoft/teamsfx-api";

export class ProgressBarFactory {
  // To store working progress bars.
  private static progressBars: Map<string, IProgressHandler | undefined> = new Map();

  public static async newProgressBar(
    name: string,
    steps_num: number,
    context: PluginContext
  ): Promise<IProgressHandler | undefined> {
    if (ProgressBarFactory.progressBars.has(name)) {
      const handler = ProgressBarFactory.progressBars.get(name);

      await handler?.end();

      return handler;
    }

    const handler = context.dialog?.createProgressBar(name, steps_num);
    if (!handler) {
      context.logProvider?.warning(`Fail to create progress bar for ${name}.`);
    }

    ProgressBarFactory.progressBars.set(name, handler);

    return handler;
  }

  public static async closeProgressBar(name?: string): Promise<void> {
    if (name) {
      await ProgressBarFactory.progressBars.get(name)?.end();
    } else {
      for (const key of ProgressBarFactory.progressBars.keys()) {
        await ProgressBarFactory.progressBars.get(key)?.end();
      }
    }
  }
}
