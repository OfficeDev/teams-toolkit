// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import {
  PermissionRequestProvider,
  Result,
  FxError,
  ok,
  err,
  UserError,
} from "@microsoft/teamsfx-api";
import { SolutionError } from "../component/constants";
import { CoreSource } from "./error";

export class PermissionRequestFileProvider implements PermissionRequestProvider {
  private rootPath: string;
  public readonly permissionFileName = "permissions.json";

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  public async checkPermissionRequest(): Promise<Result<undefined, FxError>> {
    const path = `${this.rootPath}/${this.permissionFileName}`;
    if (!(await fs.pathExists(path))) {
      return err(
        new UserError(
          CoreSource,
          SolutionError.MissingPermissionsJson,
          `${this.permissionFileName} is missing`
        )
      );
    }

    return ok(undefined);
  }

  public async getPermissionRequest(): Promise<Result<string, FxError>> {
    this.checkPermissionRequest();

    const permissionRequest = await fs.readJSON(`${this.rootPath}/${this.permissionFileName}`);
    return ok(JSON.stringify(permissionRequest));
  }
}
