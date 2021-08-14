// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import {
  PermissionRequestProvider,
  Result,
  FxError,
  ok,
  err,
  returnSystemError,
} from "@microsoft/teamsfx-api";
import { SolutionError } from "../plugins/solution/fx-solution/constants";

export class PermissionRequestFileProvider implements PermissionRequestProvider {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  public async getPermissionRequest(): Promise<Result<string, FxError>> {
    const path = `${this.rootPath}/permissions.json`;
    if (!(await fs.pathExists(path))) {
      returnSystemError(
        new Error("permissions.json is missing"),
        "Solution",
        SolutionError.MissingPermissionsJson
      );
    }

    const permissionRequest = await fs.readJSON(path);
    return ok(JSON.stringify(permissionRequest));
  }
}
