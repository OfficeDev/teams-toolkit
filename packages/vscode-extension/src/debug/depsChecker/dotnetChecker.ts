// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IDepsChecker } from "./checker";
import { DotnetCheckerImpl } from "./dotnetCheckerImpl";
import { dotnetCheckerEnabled } from "./checkerAdapter";

export class DotnetCoreChecker implements IDepsChecker {
  async getDepsInfo(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const execPath = await DotnetCheckerImpl.getDotnetExecPath();
    if (execPath) {
      map.set("execPath", execPath);
    }
    map.set("configPath", DotnetCheckerImpl.getDotnetConfigPath())
    return map;
  }

  isEnabled(): Promise<boolean> {
    return Promise.resolve(dotnetCheckerEnabled());
  }

  isInstalled(): Promise<boolean> {
    return DotnetCheckerImpl.isInstalled();
  }

  install(): Promise<void> {
    return DotnetCheckerImpl.doInstall();
  }
}
