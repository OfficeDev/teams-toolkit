// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { AzureSolutionSettings, err, Inputs, Plugin } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { CoreHookContext, isV2, NoProjectOpenedError, PathNotExistError } from "..";
import { isMultiEnvEnabled } from "../../common";
import { LocalSettingsProvider } from "../../common/localSettingsProvider";
import { PluginNames } from "../../plugins/solution/fx-solution/constants";
import { getActivatedResourcePlugins } from "../../plugins/solution/fx-solution/ResourcePluginContainer";

export const LocalSettingsLoaderMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  if (isMultiEnvEnabled()) {
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    if (!inputs.projectPath) {
      ctx.result = err(NoProjectOpenedError());
      return;
    }

    const projectPathExist = await fs.pathExists(inputs.projectPath);
    if (!projectPathExist) {
      ctx.result = err(PathNotExistError(inputs.projectPath));
      return;
    }

    const solutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
    const selectedPlugins: Plugin[] = getActivatedResourcePlugins(solutionSettings);

    const hasFrontend = selectedPlugins?.some((plugin) => plugin.name === PluginNames.FE);
    const hasBackend = selectedPlugins?.some((plugin) => plugin.name === PluginNames.FUNC);
    const hasBot = selectedPlugins?.some((plugin) => plugin.name === PluginNames.BOT);

    const localSettingsProvider = new LocalSettingsProvider(inputs.projectPath);
    if (isV2()) {
      if (await fs.pathExists(localSettingsProvider.localSettingsFilePath)) {
        ctx.localSettings = await localSettingsProvider.loadV2(ctx.contextV2?.cryptoProvider);
      } else {
        ctx.localSettings = localSettingsProvider.initV2(hasFrontend, hasBackend, hasBot);
      }
    } else if (ctx.solutionContext) {
      if (await fs.pathExists(localSettingsProvider.localSettingsFilePath)) {
        ctx.solutionContext.localSettings = await localSettingsProvider.load(
          ctx.solutionContext.cryptoProvider
        );
      } else {
        ctx.solutionContext.localSettings = localSettingsProvider.init(
          hasFrontend,
          hasBackend,
          hasBot
        );
      }
    }
  }

  await next();
};
