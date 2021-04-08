// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IDepsChecker } from "./checker";
import { DotnetCheckerImpl } from "./dotnetCheckerImpl";
import { dotnetCheckerEnabled } from "./checkerAdapter";
import { DotnetChecker } from "../dotnetSdk/dotnetChecker";

export class DotnetCoreChecker implements IDepsChecker {
  public async getDepsInfo(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const execPath = await DotnetCheckerImpl.getDotnetExecPath();
    if (execPath) {
      map.set("execPath", execPath);
    }
    map.set("configPath", DotnetCheckerImpl.getDotnetConfigPath())
    return map;
  }

  public isEnabled(): Promise<boolean> {
    return Promise.resolve(dotnetCheckerEnabled());
  }

  public isInstalled(): Promise<boolean> {
    return DotnetCheckerImpl.isInstalled();
  }

  public install(): Promise<void> {
    return DotnetCheckerImpl.doInstall();
  }

  public async getDotnetExecPath(): Promise<string> {
    let dotnetExecPath = "";
    if (this.isEnabled()) {
      const execPath = await DotnetCheckerImpl.getDotnetExecPath();
      if (execPath !== null) {
        dotnetExecPath = execPath;
      }
    } else {
      dotnetExecPath = "dotnet";
    }
    return dotnetExecPath;
  }
}

export const dotnetChecker = new DotnetCoreChecker();
