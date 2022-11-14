// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs-extra";
import * as path from "path";

import { DepsCheckerError, VxTestAppCheckError } from "../depsError";
import { DepsLogger } from "../depsLogger";
import { DepsTelemetry } from "../depsTelemetry";
import { DepsChecker, DependencyStatus, DepsType, InstallOptions } from "../depsChecker";
import { isWindows } from "../util";
import { vxTestAppInstallHelpLink } from "../constant";

// TODO: maybe change app name
const VxTestAppCommand = isWindows() ? "vxTestApp.exe" : "vxTestApp";
const VxTestAppDirInProject = path.join(".tools", "vxTestApp");
const VxTestAppExecutableRelativePath = path.join(isWindows() ? "vxTestApp.exe" : "vxTestApp");

export class VxTestAppChecker implements DepsChecker {
  private readonly _logger: DepsLogger;
  private readonly _telemetry: DepsTelemetry;

  constructor(logger: DepsLogger, telemetry: DepsTelemetry) {
    this._logger = logger;
    this._telemetry = telemetry;
  }

  public async resolve(installOptions?: InstallOptions): Promise<DependencyStatus> {
    const installInfo = await this.getInstallationInfo(installOptions);
    if (installInfo.isInstalled) {
      return installInfo;
    }
    if (installInfo.error) {
      return installInfo;
    }
    // const globalVersions = await this.getGlobalVersions();
    // if (installOptions?.version) {
    //   if (globalVersions.includes(installOptions.version)) {
    //     await this.createLinkForVersion(installOptions.version, installOptions.projectPath);
    //     return await this.getInstallationInfo(installOptions);
    //   }
    // }

    return {
      name: DepsType.VxTestApp,
      type: DepsType.VxTestApp,
      isInstalled: false,
      command: VxTestAppCommand,
      details: {
        isLinuxSupported: false,
        supportedVersions: installOptions?.version === undefined ? [] : [installOptions.version],
      },
      error: new DepsCheckerError("VxTestAppChecker not implemented", ""),
    };
  }

  public getGlobalVersion() {}

  public async getInstallationInfo(installOptions?: InstallOptions): Promise<DependencyStatus> {
    if (installOptions?.projectPath === undefined) {
      this._logger;
      return VxTestAppChecker.newDependencyStatusForInstallError(
        new VxTestAppCheckError(
          "installOptions.projectPath is undefined",
          vxTestAppInstallHelpLink
        ),
        installOptions?.version
      );
    }
    const projectPath: string = installOptions.projectPath;
    const vxTestAppExecutable = path.join(
      projectPath,
      VxTestAppDirInProject,
      VxTestAppExecutableRelativePath
    );
    if (!fs.pathExistsSync(vxTestAppExecutable)) {
      return VxTestAppChecker.newDependencyStatusForNotInstalled(installOptions.version);
    }
    // TODO(aochengwang):
    //   1. check executable permission for non-Windows OS
    //   2. check whether version is supported
    return {
      name: DepsType.VxTestApp,
      type: DepsType.VxTestApp,
      isInstalled: true,
      command: VxTestAppCommand,
      details: {
        isLinuxSupported: false,
        supportedVersions: installOptions.version === undefined ? [] : [installOptions.version],
      },
      error: undefined,
    };
  }

  private static newDependencyStatusForNotInstalled(version?: string): DependencyStatus {
    return {
      name: DepsType.VxTestApp,
      type: DepsType.VxTestApp,
      isInstalled: false,
      command: VxTestAppCommand,
      details: {
        isLinuxSupported: false,
        supportedVersions: version === undefined ? [] : [version],
      },
      error: undefined,
    };
  }

  private static newDependencyStatusForInstallError(
    error: DepsCheckerError,
    version?: string
  ): DependencyStatus {
    return {
      name: DepsType.VxTestApp,
      type: DepsType.VxTestApp,
      isInstalled: false,
      command: VxTestAppCommand,
      details: {
        isLinuxSupported: false,
        supportedVersions: version === undefined ? [] : [version],
      },
      error: error,
    };
  }
}
