// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import fs from "fs-extra";
import { MetadataV3 } from "../../common/versionMetadata";
import { ProjectModel } from "../configManager/interface";
import { ProjectTypeProps, TelemetryProperty } from "../../common/telemetry";
import { manifestUtils } from "../driver/teamsApp/utils/ManifestUtils";
import { TeamsAppManifest } from "../../../../manifest/build/manifest";

interface summary {
  version: string;
  rscApplication: string[];
  rscDelegated: string[];
}

class MetadataRscPermissionUtil {
  async parseManifest(
    ymlPath: string,
    model: ProjectModel,
    props: { [key: string]: string }
  ): Promise<void> {
    let manifestName = path.join(MetadataV3.teamsManifestFolder, MetadataV3.teamsManifestFileName);
    const action = model.provision?.driverDefs.find(
      (def) => def.uses === "teamsApp/validateManifest"
    );
    // if teamsApp/validateManifest action is defined, use the manifest file in the action
    if (action) {
      const parameters = action.with as { [key: string]: string };
      if (parameters && parameters["manifestPath"]) {
        manifestName = parameters["manifestPath"];
      }
    }
    const manifestPath = path.join(path.dirname(ymlPath), manifestName);
    if (!(await fs.pathExists(manifestPath))) {
      return;
    }

    try {
      const result = await manifestUtils._readAppManifest(manifestPath);
      if (result.isErr()) {
        return;
      }
      const manifest = result.value;
      const summary = this.summary(manifest);
      if (summary) {
        props[ProjectTypeProps.TeamsManifestVersion] = summary.version;
        props[TelemetryProperty.RscApplication] = summary.rscApplication.join(",");
        props[TelemetryProperty.RscDelegated] = summary.rscDelegated.join(",");
      }
    } catch (error) {
      return;
    }
  }

  summary(manifest: TeamsAppManifest): summary | undefined {
    const version = manifest.version;
    const rscApplication: string[] = [];
    const rscDelegated: string[] = [];
    for (const permission of manifest.authorization?.permissions?.resourceSpecific || []) {
      if (permission.type == "Application") {
        rscApplication.push(permission.name);
      } else {
        rscDelegated.push(permission.name);
      }
    }
    for (const permission of manifest.webApplicationInfo?.applicationPermissions || []) {
      rscApplication.push(permission);
    }

    return {
      version,
      rscApplication,
      rscDelegated,
    };
  }
}

export const metadataRscPermissionUtil = new MetadataRscPermissionUtil();
