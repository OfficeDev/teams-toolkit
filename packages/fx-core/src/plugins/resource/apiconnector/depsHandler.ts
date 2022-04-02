// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Json, ok } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import semver from "semver";
import { Constants } from "./constants";
import { ResultFactory, ApiConnectorResult } from "./result";
import { ErrorMessage } from "./errors";
import { getTemplatesFolder } from "../../../folder";
export class DepsHandler {
  private readonly projectRoot: string;
  private readonly componentType: string;
  constructor(workspaceFolder: string, componentType: string) {
    this.projectRoot = workspaceFolder;
    this.componentType = componentType;
  }

  public async addPkgDeps(): Promise<ApiConnectorResult> {
    const sdkConfig: Json = await this.getSkdConfig();
    return await this.updateLocalPkgSdkVersion(sdkConfig);
  }

  public async getSkdConfig(): Promise<Json> {
    const configPath = path.join(getTemplatesFolder(), "plugins", "resource", "apiconnector");
    const sdkConfigPath = path.join(configPath, Constants.sdkConfigFile);
    const sdkContent: Json = await fs.readJson(sdkConfigPath);
    return sdkContent;
  }

  public async updateLocalPkgSdkVersion(pkgConfig: Json): Promise<ApiConnectorResult> {
    const localPkgPath = path.join(this.projectRoot, this.componentType, Constants.pkgJsonFile);
    const pkgContent = await fs.readJson(localPkgPath);
    const needChange = this.sdkVersionCheck(
      pkgContent.dependencies,
      pkgConfig.name,
      pkgConfig.version
    );
    if (needChange) {
      pkgContent.dependencies[pkgConfig.name] = pkgConfig.version;
      await fs.writeFile(localPkgPath, JSON.stringify(pkgContent, null, 4));
    }
    return ResultFactory.Success();
  }

  private sdkVersionCheck(deps: Json, sdkName: string, sdkVersion: string): ApiConnectorResult {
    // always sync up with alpha version. only happens on alpha/RC version.
    if (semver.prerelease(sdkVersion)) {
      return ok(true);
    }
    // sdk not in dependencies.
    else if (!deps[sdkName]) {
      return ok(true);
    }
    // local sdk version intersect with sdk version in config.
    else if (semver.intersects(deps[sdkName], sdkVersion)) {
      return ok(false);
    }
    // local sdk version lager than sdk version in config.
    else if (semver.gt(semver.minVersion(deps[sdkName])!, semver.minVersion(sdkVersion)!)) {
      return ok(false);
    } else {
      throw ResultFactory.UserError(
        ErrorMessage.sdkVersionImcompatibleError.name,
        ErrorMessage.sdkVersionImcompatibleError.message(deps[sdkName], sdkVersion)
      );
    }
  }
}
