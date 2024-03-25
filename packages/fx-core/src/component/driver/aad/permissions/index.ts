// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IPermissionList } from "../interface/IPermissionList";
import * as jsonPermissionList from "./permissions.json";
export const graphAppId = "00000003-0000-0000-c000-000000000000";
export const graphAppName = "Microsoft Graph";
let loadedMap: any = null;
let loadedGraphPermissionMap: any = null;
export function getPermissionMap(): any {
  if (loadedMap) {
    return loadedMap;
  }
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
  loadedMap = map;
  return map;
}

export function getDetailedGraphPermissionMap(): any {
  if (loadedGraphPermissionMap) {
    return loadedGraphPermissionMap;
  }
  const permissionList = jsonPermissionList as IPermissionList;
  const graphPermission = permissionList.value.find(
    (permission) => permission.appId === graphAppId
  );
  if (!graphPermission) {
    return null;
  }
  const map: any = {};
  map.scopeIds = {};
  map.scopes = {};
  map.roleIds = {};
  map.roles = {};

  graphPermission.oauth2PermissionScopes.forEach((scope) => {
    map.scopeIds[scope.id] = {
      // value is the scope name
      value: scope.value,
      // type is either "Admin" or "User"
      type: scope.type,
    };
    map.scopes[scope.value] = scope.id;
  });

  graphPermission.appRoles.forEach((role) => {
    map.roleIds[role.id] = {
      // value is the role name
      value: role.value,
    };
    map.roles[role.value] = role.id;
  });

  loadedGraphPermissionMap = map;
  return map;
}
