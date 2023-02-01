// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsType } from "@microsoft/teamsfx-core/build/common/deps-checker";
import {
  isNodeCheckerEnabled,
  isDotnetCheckerEnabled,
  isFuncCoreToolsEnabled,
  isNgrokCheckerEnabled,
} from "./cliUtils";

export class CliDepsChecker {
  public static async getEnabledDeps(deps: DepsType[]): Promise<DepsType[]> {
    const res: DepsType[] = [];
    for (const dep of deps) {
      if (await CliDepsChecker.isEnabled(dep)) {
        res.push(dep);
      }
    }
    return res;
  }

  public static getNodeDeps(): DepsType[] {
    return [DepsType.SpfxNode, DepsType.AzureNode];
  }

  public static async isEnabled(dep: DepsType): Promise<boolean> {
    switch (dep) {
      case DepsType.AzureNode:
      case DepsType.SpfxNode:
      case DepsType.ProjectNode:
      case DepsType.LtsNode:
        return await isNodeCheckerEnabled();
      case DepsType.Dotnet:
        return await isDotnetCheckerEnabled();
      case DepsType.FuncCoreTools:
        return await isFuncCoreToolsEnabled();
      case DepsType.Ngrok:
        return await isNgrokCheckerEnabled();
      default:
        return false;
    }
  }
}
