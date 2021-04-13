// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsInfo, IDepsChecker } from "./checker";
import { DotnetCheckerImpl, DotnetCoreSDKName, installVersion, supportedVersions } from "./dotnetCheckerImpl";
import { dotnetCheckerEnabled } from "./checkerAdapter";

export class DotnetCoreChecker implements IDepsChecker {
  async getDepsInfo(): Promise<DepsInfo> {
    const map = new Map<string, string>();
    const execPath = await DotnetCheckerImpl.getDotnetExecPath();
    if (execPath) {
      map.set("execPath", execPath);
    }
    map.set("configPath", DotnetCheckerImpl.getDotnetConfigPath());
    return {
      name: DotnetCoreSDKName,
      installVersion: `${installVersion}`,
      supportedVersions: supportedVersions,
      details: map
    };
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
    if (await this.isEnabled()) {
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
