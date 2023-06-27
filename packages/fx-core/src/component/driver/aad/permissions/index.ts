// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IPermissionList } from "../interface/IPermissionList";
import * as jsonPermissionList from "./permissions.json";

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
