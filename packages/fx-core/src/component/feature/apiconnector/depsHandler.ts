// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Json } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import semver from "semver";
import { Constants } from "./constants";
import { ResultFactory, FileChange, FileChangeType } from "./result";
import { ErrorMessage } from "./errors";
import { TelemetryUtils, Telemetry } from "./telemetry";
import { getTemplatesFolder } from "../../../folder";
export class DepsHandler {
  private readonly projectRoot: string;
  private readonly componentType: string;
  constructor(workspaceFolder: string, componentType: string) {
    this.projectRoot = workspaceFolder;
    this.componentType = componentType;
  }

  public async addPkgDeps(): Promise<FileChange | undefined> {
    const depsConfig: Json = await DepsHandler.getDepsConfig();
    return await this.updateLocalPkgDepsVersion(depsConfig);
  }

  public static async getDepsConfig(): Promise<Json> {
    const configPath = path.join(getTemplatesFolder(), "plugins", "resource", "apiconnector");
    const sdkConfigPath = path.join(configPath, Constants.pkgJsonFile);
    const sdkContent: Json = fs.readJsonSync(sdkConfigPath);
    return sdkContent.dependencies;
  }

  public static async checkDepsVerSupport(
    projectPath: string,
    component: string
  ): Promise<boolean> {
    const localPkgPath = path.join(projectPath, component, Constants.pkgJsonFile);
    // fs.pathExist and fs.readJson in CLI question validation will cause unexpected behaviors
    if (!fs.pathExistsSync(localPkgPath)) {
      return false;
    }
    const pkgContent = fs.readJsonSync(localPkgPath);
    const depsConfig: Json = await DepsHandler.getDepsConfig();
    for (const pkgItem in depsConfig) {
      if (
        !DepsHandler.sdkVersionCheck(
          pkgContent.dependencies,
          pkgItem,
          depsConfig[pkgItem],
          component
        )
      ) {
        return false;
      }
    }
    return true;
  }

  public async updateLocalPkgDepsVersion(pkgConfig: Json): Promise<FileChange | undefined> {
    const localPkgPath = path.join(this.projectRoot, this.componentType, Constants.pkgJsonFile);
    if (!(await fs.pathExists(localPkgPath))) {
      throw ResultFactory.UserError(
        ErrorMessage.localPkgFileNotExistError.name,
        ErrorMessage.localPkgFileNotExistError.message(this.componentType)
      );
    }
    const pkgContent = await fs.readJson(localPkgPath);
    let needUpdate = false;
    for (const pkgItem in pkgConfig) {
      if (
        DepsHandler.sdkVersionCheck(
          pkgContent.dependencies,
          pkgItem,
          pkgConfig[pkgItem],
          this.componentType
        )
      ) {
        pkgContent.dependencies[pkgItem] = pkgConfig[pkgItem];
        needUpdate = true;
      }
    }
    if (needUpdate) {
      await fs.writeFile(localPkgPath, JSON.stringify(pkgContent, null, 4));
      const telemetryProperties = {
        [Telemetry.properties.componentType]: this.componentType,
      };

      TelemetryUtils.sendEvent(Telemetry.stage.updatePkg, undefined, telemetryProperties);
      return {
        changeType: FileChangeType.Update,
        filePath: localPkgPath,
      }; // return modified files
    }
    return undefined;
  }

  private static sdkVersionCheck(
    deps: Json,
    sdkName: string,
    sdkVersion: string,
    componentType: string
  ): boolean {
    // sdk alpha version
    if (DepsHandler.caretPrereleases(deps[sdkName], sdkVersion)) {
      return false;
    }
    // sdk not in dependencies.
    else if (!deps[sdkName]) {
      return true;
    }
    // local sdk version intersect with sdk version in config.
    else if (semver.intersects(deps[sdkName], sdkVersion)) {
      return false;
    }
    // local sdk version lager than sdk version in config.
    else if (semver.gt(semver.minVersion(deps[sdkName])!, semver.minVersion(sdkVersion)!)) {
      return false;
    } else {
      throw ResultFactory.UserError(
        ErrorMessage.sdkVersionImcompatibleError.name,
        ErrorMessage.sdkVersionImcompatibleError.message(componentType, deps[sdkName], sdkVersion)
      );
    }
  }

  private static caretPrereleases(ver1: string, ver2: string): boolean {
    if (!semver.prerelease(ver1) || !semver.prerelease(ver2)) {
      return false;
    }
    // semver.prerelease an prerelease version return alpha, beta or rc.
    // example: semver.prerelease(0.6.0-alpha.12345.0) return ["alpha", "12345", "0"]
    if (semver.prerelease(ver1)![0] != semver.prerelease(ver2)![0]) {
      return false;
    }
    if (semver.satisfies(semver.coerce(ver1)!.version, `^${semver.coerce(ver2)!.version}`)) {
      return true;
    }
    return false;
  }
}
