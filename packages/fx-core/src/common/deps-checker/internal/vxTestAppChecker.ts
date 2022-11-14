// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsCheckerError } from "../depsError";
import { DepsLogger } from "../depsLogger";
import { DepsTelemetry } from "../depsTelemetry";
import { DepsChecker, DependencyStatus, DepsType } from "../depsChecker";
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

  public async resolve(): Promise<DependencyStatus> {
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

  public async getInstallationInfo(): Promise<DependencyStatus> {
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
