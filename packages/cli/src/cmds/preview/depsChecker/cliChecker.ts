// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsType } from "@microsoft/teamsfx-core";
import {
  isNodeCheckerEnabled,
  isDotnetCheckerEnabled,
  isFuncCoreToolsEnabled,
  isNgrokCheckerEnabled,
} from "./cliUtils";

export class CliDepsChecker {
  public static async getEnabledDeps(
    deps: DepsType[],
    hasBackend: boolean,
    hasBot: boolean,
    hasFuncHostedBot: boolean
  ): Promise<DepsType[]> {
    const res: DepsType[] = [];
    for (const dep of deps) {
      if (await CliDepsChecker.isEnabled(dep, hasBackend, hasBot, hasFuncHostedBot)) {
        res.push(dep);
      }
    }
    return res;
  }

  public static async isEnabled(
    dep: DepsType,
    hasBackend: boolean,
    hasBot: boolean,
    hasFuncHostedBot: boolean
  ): Promise<boolean> {
    switch (dep) {
      case DepsType.AzureNode:
      case DepsType.SpfxNode:
        return await isNodeCheckerEnabled();
      case DepsType.FunctionNode:
        return (await isNodeCheckerEnabled()) && (hasBackend || hasFuncHostedBot);
      case DepsType.Dotnet:
        return await isDotnetCheckerEnabled();
      case DepsType.FuncCoreTools:
        return (await isFuncCoreToolsEnabled()) && (hasBackend || hasFuncHostedBot);
      case DepsType.Ngrok:
        return hasBot && (await isNgrokCheckerEnabled());
      default:
        return false;
    }
  }
}
