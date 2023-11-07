// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import fs from "fs-extra";
import isUUID from "validator/lib/isUUID";
import { MetadataV3 } from "../../common/versionMetadata";
import { ProjectModel } from "../configManager/interface";
import { AADManifest } from "../driver/aad/interface/AADManifest";
import { getDetailedGraphPermissionMap, graphAppId, graphAppName } from "../driver/aad/permissions";
import { TelemetryProperty } from "../../common/telemetry";
import { actionName } from "../driver/aad/update";
class MetadataGraphPermissionUtil {
  async parseAadManifest(
    ymlPath: string,
    model: ProjectModel,
    props: { [key: string]: string }
  ): Promise<void> {
    let aadManifestName = MetadataV3.aadManifestFileName;
    const updateAction = model.provision?.driverDefs.find((def) => def.uses === actionName);
    // if aadApp/update action is defined, use the manifest file in the action
    if (updateAction) {
      const parameters = updateAction.with as { [key: string]: string };
      if (parameters && parameters["manifestPath"]) {
        aadManifestName = parameters["manifestPath"];
      }
    }
    const aadManifestPath = path.join(path.dirname(ymlPath), aadManifestName);
    if (!(await fs.pathExists(aadManifestPath))) {
      props[TelemetryProperty.AadManifest] = "false";
      return;
    }
    props[TelemetryProperty.AadManifest] = "true";

    try {
      const manifestString = await fs.readFile(aadManifestPath, "utf8");
      const manifest = JSON.parse(manifestString);
      const graphPermissionSummary = this.getPermissionSummary(manifest);
      if (graphPermissionSummary) {
        props[TelemetryProperty.GraphPermissionHasRole] = graphPermissionSummary.hasRole
          ? "true"
          : "false";
        props[TelemetryProperty.GraphPermissionHasAdminScope] = graphPermissionSummary.hasAdminScope
          ? "true"
          : "false";
        props[TelemetryProperty.GraphPermissionScopes] = graphPermissionSummary.scopes.join(",");
      }
    } catch (error) {
      return;
    }
  }

  getPermissionSummary(manifest: AADManifest) {
    const graphPermissionMap = getDetailedGraphPermissionMap();
    if (!graphPermissionMap) {
      return undefined;
    }
    const graphPermission = manifest.requiredResourceAccess?.find(
      (item) => item.resourceAppId === graphAppId || item.resourceAppId === graphAppName
    );
    if (!graphPermission) {
      return undefined;
    }

    let hasRole = false;
    let hasAdminScope = false;
    const scopes: string[] = [];
    graphPermission.resourceAccess?.forEach((access) => {
      if (access.type === "Role") {
        hasRole = true;
      } else {
        const id = isUUID(access.id) ? access.id : graphPermissionMap.scopes[access.id];
        if (graphPermissionMap.scopeIds[id]) {
          scopes.push(graphPermissionMap.scopeIds[id].value);
          if (graphPermissionMap.scopeIds[id].type === "Admin") {
            hasAdminScope = true;
          }
        }
      }
    });
    return {
      hasRole,
      hasAdminScope,
      scopes,
    };
  }
}

export const metadataGraphPermissionUtil = new MetadataGraphPermissionUtil();
