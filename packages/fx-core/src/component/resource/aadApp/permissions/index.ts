// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, Result, UserError } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import { DEFAULT_PERMISSION_REQUEST, SolutionError } from "../../../constants";
import { Plugins } from "../constants";
import { IPermissionList } from "../interfaces/IPermissionList";
import * as jsonPermissionList from "./permissions.json";

const permissionFile = "permissions.json";

export async function createPermissionRequestFile(
  projectPath: string
): Promise<Result<string, FxError>> {
  const filePath = path.join(projectPath, permissionFile);
  await fs.writeJSON(filePath, DEFAULT_PERMISSION_REQUEST, {
    spaces: 4,
  });
  return ok(filePath);
}

export async function checkPermissionRequest(
  projectPath: string
): Promise<Result<string, FxError>> {
  const filePath = path.join(projectPath, permissionFile);
  if (!(await fs.pathExists(filePath))) {
    return err(
      new UserError(
        Plugins.pluginNameShort,
        SolutionError.MissingPermissionsJson,
        `${filePath} is missing`
      )
    );
  }
  return ok(filePath);
}

export async function getPermissionRequest(projectPath: string): Promise<Result<string, FxError>> {
  const checkRes = await checkPermissionRequest(projectPath);
  if (checkRes.isErr()) {
    return err(checkRes.error);
  }
  const permissionRequest = await fs.readJSON(checkRes.value);
  return ok(JSON.stringify(permissionRequest));
}

export function getPermissionMap(): any {
  const permissionList = jsonPermissionList as IPermissionList;
  const map: any = {};
  permissionList.value.forEach((permission) => {
    const resourceId = permission.appId;
    map[resourceId] = {};
    map[resourceId].scopes = {};
    map[resourceId].roles = {};
    map[resourceId].scopeIds = {};
    map[resourceId].roleIds = {};
    map[resourceId].id = resourceId;
    map[resourceId].displayName = permission.displayName;

    permission.oauth2PermissionScopes.forEach((scope) => {
      map[resourceId].scopes[scope.value] = scope.id;
      map[resourceId].scopeIds[scope.id] = scope.value;
    });

    permission.appRoles.forEach((appRole) => {
      map[resourceId].roles[appRole.value] = appRole.id;
      map[resourceId].roleIds[appRole.id] = appRole.value;
    });

    map[permission.displayName] = map[resourceId];
  });

  return map;
}
