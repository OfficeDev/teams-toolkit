// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsCheckerError } from "../depsError";
import { DepsLogger } from "../depsLogger";
import { DepsTelemetry } from "../depsTelemetry";
import { DepsChecker, DependencyStatus, DepsType, InstallOptions } from "../depsChecker";
import { isWindows } from "../util";

// TODO: maybe change app name
const VxTestAppCommand = isWindows() ? "vxTestApp.exe" : "vxTestApp";

export class VxTestAppChecker implements DepsChecker {
  private readonly _logger: DepsLogger;
  private readonly _telemetry: DepsTelemetry;

  constructor(logger: DepsLogger, telemetry: DepsTelemetry) {
    this._logger = logger;
    this._telemetry = telemetry;
  }

  public async resolve(installOptions?: InstallOptions): Promise<DependencyStatus> {
    return {
      name: DepsType.VxTestApp,
      type: DepsType.VxTestApp,
      isInstalled: false,
      command: VxTestAppCommand,
      details: {
        isLinuxSupported: false,
        supportedVersions: [],
      },
      error: new DepsCheckerError("VxTestAppChecker is not implemented", ""),
    };
  }

  public async getInstallationInfo(installOptions?: InstallOptions): Promise<DependencyStatus> {
    return {
      name: DepsType.VxTestApp,
      type: DepsType.VxTestApp,
      isInstalled: false,
      command: VxTestAppCommand,
      details: {
        isLinuxSupported: false,
        supportedVersions: [],
      },
      error: undefined,
    };
  }
}
