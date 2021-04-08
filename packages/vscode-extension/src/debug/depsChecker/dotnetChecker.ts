// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsInfo, IDepsChecker } from "./checker";
import { DotnetCheckerImpl, DotnetVersion } from "./dotnetCheckerImpl";
import { dotnetCheckerEnabled } from "./checkerAdapter";

const DotnetCoreSDKName = ".NET Core SDK";

export class DotnetCoreChecker implements IDepsChecker {
  async getDepsInfo(): Promise<DepsInfo> {
    const map = new Map<string, string>();
    const execPath = await DotnetCheckerImpl.getDotnetExecPath();
    if (execPath) {
      map.set("execPath", execPath);
    }
    map.set("configPath", DotnetCheckerImpl.getDotnetConfigPath())
    return {
      nameWithVersion: `${DotnetCoreSDKName} (v${DotnetVersion.v31})`,
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
